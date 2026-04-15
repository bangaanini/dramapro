import { NextRequest } from "next/server";

export function getSecretFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-cron-secret")?.trim() ?? null;
}

export function hasValidInternalSecret(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const suppliedSecret = getSecretFromRequest(request);

  return Boolean(cronSecret && suppliedSecret && suppliedSecret === cronSecret);
}
