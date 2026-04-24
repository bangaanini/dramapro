import { Prisma } from "@/app/generated/prisma/client";

export function isPrismaDatabaseConnectionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P1001"
  ) {
    return true;
  }

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes("can't reach database server") ||
    message.includes("connect timeout") ||
    message.includes("connection refused") ||
    message.includes("getaddrinfo") ||
    message.includes("econnrefused") ||
    message.includes("etimedout")
  );
}
