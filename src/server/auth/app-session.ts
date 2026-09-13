import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { appUserDirectory } from "./directory";
import { requireSession, type Session } from "./session";

export const APP_SESSION_COOKIE = "agrichain_session";
const SESSION_TTL_SECONDS = 60 * 60;

type SessionEnvelope = { accessToken: string; expiresAt: number };

function secret(): string {
  const value = process.env.APP_SESSION_SECRET;
  if (!value || value.length < 32)
    throw new Error("APP_SESSION_SECRET minimal 32 karakter wajib di-set");
  return value;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function equal(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createAppSession(
  accessToken: string,
): Promise<{ token: string; session: Session }> {
  const session = await requireSession(`Bearer ${accessToken}`, appUserDirectory);
  const payload = Buffer.from(
    JSON.stringify({ accessToken, expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }),
  ).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, session };
}

export async function readAppSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const [payload, signature, ...rest] = token.split(".");
    if (!payload || !signature || rest.length || !equal(sign(payload), signature)) return null;
    const envelope = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as SessionEnvelope;
    if (!envelope.accessToken || envelope.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return await requireSession(`Bearer ${envelope.accessToken}`, appUserDirectory);
  } catch {
    return null;
  }
}

export const appSessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
