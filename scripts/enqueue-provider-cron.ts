import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  defaultCatalogParams,
  providerCatalogSections,
} from "../lib/streamapi/catalog-sections";
import { PROVIDERS } from "../lib/streamapi/registry";
import type { CatalogSectionDefinition, ProviderCode } from "../lib/streamapi/types";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalInt(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function isProviderCode(value: string): value is ProviderCode {
  return (PROVIDERS as readonly string[]).includes(value);
}

function sectionHasSafeDefaults(section: CatalogSectionDefinition) {
  return section.params.every((param) => {
    if (param.type === "fixed" || param.name === "page" || !param.required) {
      return true;
    }

    return param.defaultValue !== undefined && String(param.defaultValue).trim() !== "";
  });
}

function getSelectedProviders() {
  const selected = parseList(process.env.PROVIDER_CRON_PROVIDERS);

  if (!selected.length || selected.includes("all")) {
    return [...PROVIDERS];
  }

  return selected.filter(isProviderCode);
}

function getSelectedSections(provider: ProviderCode) {
  const sections = providerCatalogSections[provider] ?? [];
  const mode = process.env.PROVIDER_CRON_SECTIONS?.trim() || "default";
  const allowEmptyParams = process.env.PROVIDER_CRON_ALLOW_EMPTY_PARAMS === "1";
  const isSafe = (section: CatalogSectionDefinition) =>
    allowEmptyParams || sectionHasSafeDefaults(section);

  if (mode === "all") {
    return sections.filter(isSafe);
  }

  if (mode === "default") {
    const firstSafe = sections.find(isSafe);
    return firstSafe ? [firstSafe] : [];
  }

  const requested = parseList(mode);
  return sections.filter((section) => {
    if (!isSafe(section)) return false;

    return requested.some((item) => {
      const [maybeProvider, maybeSection] = item.split(":");
      if (maybeSection) {
        return maybeProvider === provider && maybeSection === section.value;
      }

      return maybeProvider === section.value;
    });
  });
}

function pagesForSection(section: CatalogSectionDefinition) {
  if (!section.supportsPage) {
    return [section.defaultPage];
  }

  const pageCount = Math.min(parsePositiveInt(process.env.PROVIDER_CRON_PAGE_COUNT, 1), 20);
  const startPage = parseOptionalInt(process.env.PROVIDER_CRON_PAGE_START) ?? section.defaultPage;

  return Array.from({ length: pageCount }, (_, index) => startPage + index);
}

async function main() {
  loadEnvFile(resolve(process.cwd(), ".env"));
  loadEnvFile(resolve(process.cwd(), ".env.local"));

  const {
    enqueueProviderEndpointSync,
    initializeStreamApiCatalog,
    logProviderWorker,
    validateProviderEndpointInput,
  } = await import("../lib/provider-sync");
  const { prisma } = await import("../lib/prisma");

  const dryRun = process.env.PROVIDER_CRON_DRY_RUN === "1";
  const providers = getSelectedProviders();
  const queuedJobs: string[] = [];
  const skipped: string[] = [];

  if (!dryRun) {
    await initializeStreamApiCatalog();
  }

  for (const provider of providers) {
    const sections = getSelectedSections(provider);

    if (!sections.length) {
      skipped.push(`${provider}: no safe section`);
      continue;
    }

    for (const section of sections) {
      const defaultParams = defaultCatalogParams(section);

      for (const page of pagesForSection(section)) {
        try {
          const validated = validateProviderEndpointInput({
            provider,
            section: section.value,
            page,
            params: defaultParams,
            lang: "id",
          });

          const label = `${validated.provider}/${validated.section.value} page=${validated.page}`;

          if (dryRun) {
            console.info(`[dry-run] would enqueue ${label}`);
            queuedJobs.push(label);
            continue;
          }

          const job = await enqueueProviderEndpointSync(
            validated.provider,
            validated.section.value,
            validated.page,
            validated.params,
            validated.lang,
          );

          console.info(`Queued ${label} job=${job.id}`);
          queuedJobs.push(label);
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown error";
          skipped.push(`${provider}/${section.value}: ${message}`);
        }
      }
    }
  }

  if (!dryRun) {
    await logProviderWorker({
      level: "info",
      message: `Provider cron queued ${queuedJobs.length} jobs.`,
      meta: {
        providers,
        queued: queuedJobs.length,
        skipped,
      },
    });
  }

  console.info(`Provider cron selesai. queued=${queuedJobs.length} skipped=${skipped.length}`);

  if (skipped.length) {
    console.info("Skipped:");
    for (const item of skipped) {
      console.info(`- ${item}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
