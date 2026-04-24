import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaSchemaSignature?: string;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prismaSchemaSignature = Object.keys(
  Prisma.CatalogSeriesScalarFieldEnum,
).join("|");

function createPrismaClient() {
  return new PrismaClient({
    adapter,
  });
}

const shouldReusePrisma =
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaSignature === prismaSchemaSignature;

if (globalForPrisma.prisma && !shouldReusePrisma) {
  void globalForPrisma.prisma.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
}

export const prisma: PrismaClient = shouldReusePrisma
  ? (globalForPrisma.prisma as PrismaClient)
  : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaSignature = prismaSchemaSignature;
}
