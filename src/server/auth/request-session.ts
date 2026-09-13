import "server-only";

import { extractBearerToken } from "./privy";
import { requireSession, type Session } from "./session";
import { appUserDirectory } from "./directory";

/** Authenticate a mutating route directly from its Bearer token. */
export async function requireRequestSession(request: Request): Promise<Session> {
  return requireSession(request.headers.get("authorization"), appUserDirectory);
}

export function getRequestAccessToken(request: Request): string | null {
  return extractBearerToken(request.headers.get("authorization"));
}
