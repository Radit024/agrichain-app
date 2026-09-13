import "server-only";
import { PrivyClient } from "@privy-io/node";

/**
 * Verifikasi access token Privy di SERVER (PRD: kontrol UI bukan keamanan).
 * Boundary ini yang di-mock pada integration test (K11).
 */

let cached: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (cached) return cached;
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("PRIVY_APP_ID dan PRIVY_APP_SECRET wajib di-set di server");
  }
  cached = new PrivyClient(appId, appSecret);
  return cached;
}

export interface VerifiedPrivyUser {
  did: string;
  email?: string;
  walletAddress?: string;
}

/** Hasil verifikasi token — tidak pernah melempar data mentah token. */
export async function verifyPrivyAccessToken(accessToken: string): Promise<VerifiedPrivyUser> {
  const client = getPrivyClient();
  const verified = await client.verifyAuthToken(accessToken);
  if (!verified) {
    throw new PrivyAuthError("SESSION_INVALID");
  }
  return {
    did: verified.userId,
    email: verified.linkedAccounts?.find((a) => a.type === "email")?.address,
    walletAddress: verified.linkedAccounts?.find((a) => a.type === "wallet")?.address,
  };
}

export class PrivyAuthError extends Error {
  constructor(public code: "SESSION_INVALID" | "SESSION_EXPIRED" | "NO_ACCESS") {
    super(code);
    this.name = "PrivyAuthError";
  }
}

/** Ekstrak token dari header Authorization: Bearer <token>. */
export function extractBearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}
