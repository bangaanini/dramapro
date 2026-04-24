import {
  completeCatalogSyncAllJobAfterIndex,
  runCatalogSyncAllStep,
  startCatalogSyncAllJob,
} from "../lib/catalog";

type SyncJobPayload = {
  id: string;
  status: string;
  phase: string;
  currentPlatformId: string;
  currentTabName: string;
  totalPlatforms: number;
  completedPlatforms: number;
  totalTabs: number;
  completedTabs: number;
  totalTitles: number;
  totalEpisodes: number;
  pendingDetails: number;
  processedDetails: number;
  errorCount: number;
  lastMessage: string;
  progressPercent: number;
  updatedAt: string;
};

const STEP_DELAY_MS = 400;

function getArgValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatJob(job: SyncJobPayload) {
  return [
    `status=${job.status}`,
    `phase=${job.phase}`,
    `platform=${job.currentPlatformId || "-"}`,
    `tab=${job.currentTabName || "-"}`,
    `progress=${job.progressPercent}%`,
    `providers=${job.completedPlatforms}/${job.totalPlatforms}`,
    `tabs=${job.completedTabs}/${job.totalTabs}`,
    `titles=${job.totalTitles}`,
    `episodes=${job.totalEpisodes}`,
    `pendingDetails=${job.pendingDetails}`,
    `processedDetails=${job.processedDetails}`,
    `errors=${job.errorCount}`,
    `message=${job.lastMessage}`,
  ].join(" | ");
}

async function main() {
  const language = (getArgValue("--language") ?? "id").trim() || "id";
  const jobId = (getArgValue("--job-id") ?? "").trim() || undefined;
  const runnerId =
    (getArgValue("--runner-id") ?? `manual:${Date.now()}`).trim() ||
    `manual:${Date.now()}`;
  const resume = hasFlag("--resume");
  const indexOnly = hasFlag("--index-only");

  let job: SyncJobPayload | null = null;

  if (resume) {
    job = await runCatalogSyncAllStep(jobId, runnerId);
  } else {
    job = await startCatalogSyncAllJob(language);
  }

  if (!job) {
    console.error(
      resume
        ? "Tidak ada job aktif yang bisa di-resume."
        : "Gagal membuat job sync.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `${resume ? "resume" : "start"} job=${job.id} language=${language} runner=${runnerId}`,
  );
  console.log(formatJob(job));

  let lastFingerprint = "";

  while (true) {
    const nextJob = await runCatalogSyncAllStep(job.id, runnerId);

    if (!nextJob) {
      console.error("Job tidak ditemukan lagi.");
      process.exitCode = 1;
      return;
    }

    job = nextJob;
    const fingerprint = [
      job.status,
      job.phase,
      job.currentPlatformId,
      job.currentTabName,
      job.completedPlatforms,
      job.completedTabs,
      job.totalTitles,
      job.totalEpisodes,
      job.pendingDetails,
      job.processedDetails,
      job.errorCount,
      job.lastMessage,
    ].join("|");

    if (fingerprint !== lastFingerprint) {
      console.log(formatJob(job));
      lastFingerprint = fingerprint;
    }

    if (indexOnly && job.phase === "audit-series") {
      const completed = await completeCatalogSyncAllJobAfterIndex(job.id, runnerId);

      if (!completed) {
        console.error("Gagal menyelesaikan job di batas akhir index.");
        process.exitCode = 1;
        return;
      }

      job = completed;
      console.log(formatJob(job));
      break;
    }

    if (
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "cancelled"
    ) {
      break;
    }

    await sleep(STEP_DELAY_MS);
  }

  if (job.status !== "completed") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
