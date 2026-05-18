/**
 * Integration test untuk mergeUsers — Section 6.1 spec.
 *
 * Jalankan: `npx tsx scripts/test-merge-users.ts`
 *
 * Pre-req: DATABASE_URL mengarah ke DB lokal/test (BUKAN production).
 *
 * Skrip ini:
 * 1. Seed dua user fixture (winner web + loser mini-app) dengan data lengkap
 * 2. Call mergeUsers
 * 3. Assert hasil merge sesuai spec
 * 4. Cleanup fixture
 */

import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep).trim();
    let value = trimmed.slice(sep + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));

const FIXTURE_PREFIX = "merge-test-";
const TEST_PASSWORD = "valid-password-123";

let prisma: typeof import("@/lib/prisma").prisma;
let mergeUsers: typeof import("@/lib/user-auth").mergeUsers;

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function ts() {
  return new Date().toISOString();
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERT FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function cleanup() {
  // Hapus fixture berdasarkan prefix di email/telegramId
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: FIXTURE_PREFIX } },
        { telegramId: { startsWith: FIXTURE_PREFIX } },
        { name: { startsWith: FIXTURE_PREFIX } },
      ],
    },
  });
  // Cleanup orphan series (kalau test bikin) tidak perlu — kita reuse seri existing
}

async function pickAnySeries() {
  const series = await prisma.catalogSeries.findFirst({
    select: { id: true },
  });
  if (!series) {
    throw new Error(
      "Tidak ada CatalogSeries di DB. Jalankan seed catalog dulu sebelum test ini.",
    );
  }
  return series.id;
}

async function pickTwoSeries() {
  const series = await prisma.catalogSeries.findMany({
    take: 2,
    select: { id: true },
  });
  if (series.length < 2) {
    throw new Error(
      "Butuh minimal 2 CatalogSeries di DB untuk test ini. Jalankan seed catalog dulu.",
    );
  }
  return [series[0].id, series[1].id] as const;
}

async function seedFixtures(seriesXId: string, seriesYId: string) {
  console.log(`[${ts()}] Seeding fixtures...`);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // WINNER: akun web dengan VIP +30 hari, favorite seri X, watch history seri X 1 minggu lalu
  const winner = await prisma.user.create({
    data: {
      email: `${FIXTURE_PREFIX}winner@example.com`,
      name: `${FIXTURE_PREFIX}winner`,
      authProvider: "local",
      passwordHash: hashPassword(TEST_PASSWORD),
      telegramUsername: "alice",
      vipStartedAt: new Date(now - 5 * day),
      vipExpiresAt: new Date(now + 30 * day),
      affiliateCode: `${FIXTURE_PREFIX}WINNER`,
    },
  });

  // LOSER: akun mini-app dengan VIP +10 hari, favorites X+Y, watch X kemarin
  const loser = await prisma.user.create({
    data: {
      authProvider: "telegram",
      name: `${FIXTURE_PREFIX}loser`,
      telegramId: `${FIXTURE_PREFIX}99999`,
      telegramUsername: "alice",
      telegramFirstName: "Alice",
      telegramLastName: "Tester",
      telegramLanguageCode: "id",
      vipStartedAt: new Date(now - 2 * day),
      vipExpiresAt: new Date(now + 10 * day),
      affiliateCode: `${FIXTURE_PREFIX}LOSER`,
    },
  });

  // Favorites
  await prisma.favoriteDrama.create({
    data: { userId: winner.id, seriesId: seriesXId },
  });
  await prisma.favoriteDrama.create({
    data: { userId: loser.id, seriesId: seriesXId }, // konflik dengan winner
  });
  await prisma.favoriteDrama.create({
    data: { userId: loser.id, seriesId: seriesYId }, // unik di loser
  });

  // WatchHistory: winner punya seri X (1 minggu lalu), loser punya seri X (kemarin, lebih baru)
  await prisma.watchHistory.create({
    data: {
      userId: winner.id,
      seriesId: seriesXId,
      episodeIndex: 1,
      lastPositionSeconds: 100,
      watchedAt: new Date(now - 7 * day),
      updatedAt: new Date(now - 7 * day),
    },
  });
  await prisma.watchHistory.create({
    data: {
      userId: loser.id,
      seriesId: seriesXId,
      episodeIndex: 5,
      lastPositionSeconds: 500,
      watchedAt: new Date(now - 1 * day),
      updatedAt: new Date(now - 1 * day),
    },
  });

  // SavedEpisode loser
  await prisma.savedEpisode.create({
    data: {
      userId: loser.id,
      seriesId: seriesYId,
      episodeIndex: 3,
    },
  });

  // UserSession loser (akan jadi session winner setelah merge)
  const sessionLoser = await prisma.userSession.create({
    data: {
      userId: loser.id,
      tokenHash: `${FIXTURE_PREFIX}token-hash`,
      expiresAt: new Date(now + 30 * day),
    },
  });

  return { winner, loser, sessionLoser };
}

async function main() {
  console.log(`[${ts()}] Starting merge integration test`);

  ({ prisma } = await import("@/lib/prisma"));
  ({ mergeUsers } = await import("@/lib/user-auth"));

  await cleanup();

  const [seriesXId, seriesYId] = await pickTwoSeries();
  console.log(`  Using seriesX=${seriesXId}, seriesY=${seriesYId}`);

  const { winner, loser, sessionLoser } = await seedFixtures(
    seriesXId,
    seriesYId,
  );
  console.log(
    `  Seeded winner=${winner.id}, loser=${loser.id}, session=${sessionLoser.id}`,
  );

  console.log(`\n[${ts()}] Negative test: password salah`);
  const wrongPasswordResult = await mergeUsers({
    winnerId: winner.id,
    loserId: loser.id,
    providedPassword: "wrong-password",
  });
  assert(!wrongPasswordResult.ok, "merge dengan password salah harus return ok=false");
  if (!wrongPasswordResult.ok) {
    assert(
      wrongPasswordResult.error === "Password salah.",
      `error message harus 'Password salah.', dapat: '${wrongPasswordResult.error}'`,
    );
  }
  const winnerAfterFail = await prisma.user.findUnique({
    where: { id: winner.id },
  });
  const loserAfterFail = await prisma.user.findUnique({
    where: { id: loser.id },
  });
  assert(
    winnerAfterFail !== null && loserAfterFail !== null,
    "kedua user tetap utuh setelah merge gagal",
  );

  console.log(`\n[${ts()}] Positive test: password benar`);
  const result = await mergeUsers({
    winnerId: winner.id,
    loserId: loser.id,
    providedPassword: TEST_PASSWORD,
  });
  assert(result.ok, "merge harus sukses");

  console.log(`\n[${ts()}] Verifying merge results`);

  const merged = await prisma.user.findUnique({
    where: { id: winner.id },
  });
  const loserAfter = await prisma.user.findUnique({
    where: { id: loser.id },
  });

  assert(loserAfter === null, "loser harus dihapus");
  assert(merged !== null, "winner masih ada");

  if (!merged) throw new Error("merged null");

  assert(
    merged.telegramId === `${FIXTURE_PREFIX}99999`,
    `telegramId loser pindah ke winner: ${merged.telegramId}`,
  );
  assert(
    merged.telegramUsername === "alice",
    `telegramUsername sync dari loser: ${merged.telegramUsername}`,
  );
  assert(
    merged.telegramFirstName === "Alice",
    "telegramFirstName ikut pindah",
  );

  // VIP: winner punya +30d, loser +10d → harus +30d (max)
  const expectedExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const actualExpiry = merged.vipExpiresAt?.getTime() ?? 0;
  const expiryDiff = Math.abs(actualExpiry - expectedExpiry);
  assert(
    expiryDiff < 60 * 1000,
    `vipExpiresAt mengambil winner (max), diff=${expiryDiff}ms`,
  );

  assert(
    merged.affiliateCode === `${FIXTURE_PREFIX}WINNER`,
    `affiliateCode tetap winner: ${merged.affiliateCode}`,
  );

  // Favorites: harus ada seri X dan Y di winner, no duplicate
  const favorites = await prisma.favoriteDrama.findMany({
    where: { userId: winner.id },
  });
  assert(
    favorites.length === 2,
    `favorites = 2 (seri X + Y, no dup), actual=${favorites.length}`,
  );
  const favSeriesIds = favorites.map((f) => f.seriesId).sort();
  const expectedFavSeries = [seriesXId, seriesYId].sort();
  assert(
    JSON.stringify(favSeriesIds) === JSON.stringify(expectedFavSeries),
    "favorites berisi seri X dan Y",
  );

  // WatchHistory: 1 row untuk seri X dengan updatedAt terbaru (dari loser)
  const histories = await prisma.watchHistory.findMany({
    where: { userId: winner.id },
  });
  assert(
    histories.length === 1,
    `watchHistory = 1 row (deduped), actual=${histories.length}`,
  );
  const hist = histories[0];
  assert(
    hist.episodeIndex === 5 && hist.lastPositionSeconds === 500,
    `watchHistory dari loser yang terbaru: episode=${hist.episodeIndex}, pos=${hist.lastPositionSeconds}`,
  );

  // SavedEpisode: dari loser, harus pindah
  const saved = await prisma.savedEpisode.findMany({
    where: { userId: winner.id },
  });
  assert(saved.length === 1, "savedEpisode loser pindah ke winner");

  // UserSession loser: harus userId-nya sekarang winner
  const sessionAfter = await prisma.userSession.findUnique({
    where: { id: sessionLoser.id },
  });
  assert(
    sessionAfter !== null && sessionAfter.userId === winner.id,
    "UserSession loser ikut pindah ke winner",
  );

  console.log(`\n[${ts()}] Cleanup`);
  await cleanup();

  console.log(`\n[${ts()}] ✓ All assertions passed.`);
}

main()
  .catch(async (error) => {
    console.error("\n✗ TEST FAILED:");
    console.error(error);
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
