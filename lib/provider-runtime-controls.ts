import { ProviderHealthStatus, ProviderName } from "@/app/generated/prisma/enums";
import { PROVIDERS, type ProviderType } from "@/lib/provider-adapter";
import { prisma } from "@/lib/prisma";
import {
  DramaStreamResolutionError,
  resolveDramaStreamSources,
} from "@/lib/stream-access";

export type ProviderRuntimeSummary = {
  providerName: ProviderType;
  isHomepageVisible: boolean;
  healthStatus: ProviderHealthStatus;
  healthMessage: string;
  checkedDramaId: string;
  checkedDramaTitle: string;
  lastCheckedAt: string | null;
};

const HEALTH_SAMPLE_SIZE = 3;

function normalizeSummary(
  providerName: ProviderType,
  row?: {
    providerName: ProviderName;
    isHomepageVisible: boolean;
    healthStatus: ProviderHealthStatus;
    healthMessage: string;
    checkedDramaId: string;
    checkedDramaTitle: string;
    lastCheckedAt: Date | null;
  } | null,
): ProviderRuntimeSummary {
  return {
    providerName,
    isHomepageVisible: row?.isHomepageVisible ?? true,
    healthStatus: row?.healthStatus ?? ProviderHealthStatus.unknown,
    healthMessage: row?.healthMessage ?? "",
    checkedDramaId: row?.checkedDramaId ?? "",
    checkedDramaTitle: row?.checkedDramaTitle ?? "",
    lastCheckedAt: row?.lastCheckedAt?.toISOString() ?? null,
  };
}

async function fetchProviderRuntimeControls() {
  const rows = await prisma.providerRuntimeControl.findMany();
  const mapped = new Map(rows.map((row) => [row.providerName, row]));

  return PROVIDERS.map((providerName) =>
    normalizeSummary(providerName, mapped.get(providerName as ProviderName)),
  );
}

export async function getProviderRuntimeControls() {
  return fetchProviderRuntimeControls();
}

export async function getHomepageVisibleProviders() {
  const controls = await getProviderRuntimeControls();

  return controls
    .filter((control) => control.isHomepageVisible)
    .map((control) => control.providerName);
}

export async function setProviderHomepageVisibility(
  providerName: ProviderType,
  isHomepageVisible: boolean,
) {
  return prisma.providerRuntimeControl.upsert({
    where: {
      providerName: providerName as ProviderName,
    },
    create: {
      providerName: providerName as ProviderName,
      isHomepageVisible,
    },
    update: {
      isHomepageVisible,
    },
  });
}

export async function checkProviderStreamHealth(
  providerName: ProviderType,
): Promise<ProviderRuntimeSummary> {
  const samples = await prisma.drama.findMany({
    where: { providerName: providerName as ProviderName },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: HEALTH_SAMPLE_SIZE,
    select: {
      id: true,
      title: true,
    },
  });

  const checkedAt = new Date();

  if (!samples.length) {
    const saved = await prisma.providerRuntimeControl.upsert({
      where: {
        providerName: providerName as ProviderName,
      },
      create: {
        providerName: providerName as ProviderName,
        healthStatus: ProviderHealthStatus.no_data,
        healthMessage:
          "Belum ada drama provider ini di database lokal untuk diuji.",
        lastCheckedAt: checkedAt,
      },
      update: {
        healthStatus: ProviderHealthStatus.no_data,
        healthMessage:
          "Belum ada drama provider ini di database lokal untuk diuji.",
        checkedDramaId: "",
        checkedDramaTitle: "",
        lastCheckedAt: checkedAt,
      },
    });

    return normalizeSummary(providerName, saved);
  }

  let lastMessage = "Provider belum lolos pemeriksaan stream.";
  let lastDramaId = "";
  let lastDramaTitle = "";

  for (const sample of samples) {
    try {
      await resolveDramaStreamSources({
        internalDramaId: sample.id,
        episodeIndex: 1,
        bypassVipLock: true,
      });

      const healthy = await prisma.providerRuntimeControl.upsert({
        where: {
          providerName: providerName as ProviderName,
        },
        create: {
          providerName: providerName as ProviderName,
          healthStatus: ProviderHealthStatus.healthy,
          healthMessage: `Stream episode 1 normal untuk drama sample "${sample.title}".`,
          checkedDramaId: sample.id,
          checkedDramaTitle: sample.title,
          lastCheckedAt: checkedAt,
        },
        update: {
          healthStatus: ProviderHealthStatus.healthy,
          healthMessage: `Stream episode 1 normal untuk drama sample "${sample.title}".`,
          checkedDramaId: sample.id,
          checkedDramaTitle: sample.title,
          lastCheckedAt: checkedAt,
        },
      });

      return normalizeSummary(providerName, healthy);
    } catch (error) {
      lastDramaId = sample.id;
      lastDramaTitle = sample.title;
      lastMessage =
        error instanceof DramaStreamResolutionError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Provider gagal diuji karena error tidak dikenal.";
    }
  }

  const unhealthy = await prisma.providerRuntimeControl.upsert({
    where: {
      providerName: providerName as ProviderName,
    },
    create: {
      providerName: providerName as ProviderName,
      healthStatus: ProviderHealthStatus.stream_error,
      healthMessage: `Semua sample gagal. Terakhir: ${lastMessage}`,
      checkedDramaId: lastDramaId,
      checkedDramaTitle: lastDramaTitle,
      lastCheckedAt: checkedAt,
    },
    update: {
      healthStatus: ProviderHealthStatus.stream_error,
      healthMessage: `Semua sample gagal. Terakhir: ${lastMessage}`,
      checkedDramaId: lastDramaId,
      checkedDramaTitle: lastDramaTitle,
      lastCheckedAt: checkedAt,
    },
  });

  return normalizeSummary(providerName, unhealthy);
}

export async function checkAllProviderStreamHealth() {
  const summaries: ProviderRuntimeSummary[] = [];

  for (const providerName of PROVIDERS) {
    summaries.push(await checkProviderStreamHealth(providerName));
  }

  return summaries;
}
