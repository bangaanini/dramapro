import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());

  const { initializeCatalog } = await import("@/lib/catalog");
  const result = await initializeCatalog();
  console.log(
    JSON.stringify(
      {
        ok: true,
        tabsSynced: result.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    loadEnvConfig(process.cwd());
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
  });
