import "server-only";
import { verifyAccessToken } from "@privy-io/node";

/**
 * Verifikasi access token Privy di SERVER (PRD: kontrol UI bukan keamanan).
 * Boundary ini yang di-mock pada integration test (K11).
 * API node-sdk: verifyAccessToken({access_token, app_id, verification_key}).
 */

export class PrivyAuthError extends Error {
  constructor(public code: "SESSION_INVALID" | "SESSION_EXPIRED" | "NO_ACCESS") {
    super(code);
    this.name = "PrivyAuthError";
  }
}

export interface VerifiedPrivyUser {
  did: string;
  email?: string;
  walletAddress?: string;
}

function getVerifyConfig() {
  const appId = process.env.PRIVY_APP_ID;
  const verificationKey = process.env.PRIVY_VERIFICATION_KEY;
  if (!appId || !verificationKey) {
    throw new Error("PRIVY_APP_ID dan PRIVY_VERIFICATION_KEY wajib di-set di lingkungan server");
  }
  return { appId, verificationKey };
}

/** Hasil verifikasi token — tidak pernah melempar data mentah token.
 * DID saja; email/wallet dibaca dari profil internal (app_users) via aktivasi. */
export async function verifyPrivyAccessToken(accessToken: string): Promise<VerifiedPrivyUser> {
  const { appId, verificationKey } = getVerifyConfig();
  let payload;
  try {
    payload = await verifyAccessToken({
      access_token: accessToken,
      app_id: appId,
      verification_key: verificationKey,
    });
  } catch {
    throw new PrivyAuthError("SESSION_INVALID");
  }
  if (!payload || !payload.user_id) {
    throw new PrivyAuthError("SESSION_INVALID");
  }
  if (payload.expiration * 1000 < Date.now()) {
    throw new PrivyAuthError("SESSION_EXPIRED");
  }
  return { did: payload.user_id };
}

/** Ekstrak token dari header Authorization: Bearer <token>. */
export function extractBearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}
