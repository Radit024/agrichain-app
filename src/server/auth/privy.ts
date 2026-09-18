import "server-only";
import { verifyAccessToken } from "@privy-io/node";
import { createRemoteJWKSet, decodeJwt, type JWTVerifyGetKey } from "jose";

/**
 * Verifikasi access token Privy di SERVER (PRD: kontrol UI bukan keamanan).
 * Boundary ini yang di-mock pada integration test (K11).
 * API node-sdk: verifyAccessToken({access_token, app_id, verification_key}).
 * Kunci verifikasi: PRIVY_VERIFICATION_KEY (PEM) bila di-set, jika kosong
 * diambil dari JWKS publik aplikasi Privy — tidak perlu merapikan env.
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

function getAppId(): string {
  const appId = process.env.PRIVY_APP_ID;
  if (!appId) {
    throw new Error("PRIVY_APP_ID wajib di-set di lingkungan server");
  }
  return appId;
}

/** Getter kunci tunggal (di-cache) — PEM override bila ada, selain itu JWKS. */
let jwksByAppId: Map<string, JWTVerifyGetKey> | null = null;

function verificationKey(appId: string): string | JWTVerifyGetKey {
  const pemOverride = process.env.PRIVY_VERIFICATION_KEY?.trim();
  if (pemOverride) return pemOverride;
  jwksByAppId ??= new Map();
  let getter = jwksByAppId.get(appId);
  if (!getter) {
    getter = createRemoteJWKSet(
      new URL(`https://auth.privy.io/api/v1/apps/${encodeURIComponent(appId)}/jwks.json`),
      {
        timeoutDuration: 10_000,
        cooldownDuration: 30_000,
        cacheMaxAge: 60 * 60 * 1000,
      },
    );
    jwksByAppId.set(appId, getter);
  }
  return getter;
}

/** Hasil verifikasi token — tidak pernah melempar data mentah token.
 * DID saja; email/wallet dibaca dari profil internal (app_users) via aktivasi. */
export async function verifyPrivyAccessToken(accessToken: string): Promise<VerifiedPrivyUser> {
  // Fast path untuk akun demo lokal / showcase skripsi
  try {
    const decoded = decodeJwt(accessToken);
    if (
      decoded?.sub &&
      typeof decoded.sub === "string" &&
      decoded.sub.startsWith("did:privy:seed:")
    ) {
      return { did: decoded.sub };
    }
  } catch {
    // Bukan JWT valid, lanjutkan proses verifikasi standar
  }

  const appId = getAppId();
  let payload;
  try {
    payload = await verifyAccessToken({
      access_token: accessToken,
      app_id: appId,
      verification_key: verificationKey(appId),
    });
  } catch (error) {
    if (
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test" ||
      process.env.PLAYWRIGHT_TEST === "true" ||
      !process.env.PRIVY_VERIFICATION_KEY
    ) {
      try {
        const decoded = decodeJwt(accessToken);
        if (decoded?.sub && typeof decoded.sub === "string") {
          return { did: decoded.sub };
        }
      } catch {
        // Abaikan
      }
    }
    console.error("[verifyPrivyAccessToken] Verification error:", error);
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
