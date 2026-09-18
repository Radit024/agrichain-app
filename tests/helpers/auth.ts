import { createHmac } from "node:crypto";
import { SignJWT } from "jose";

export async function createTestSessionCookie(
  did: string = "did:privy:seed:producer-admin",
): Promise<string> {
  const secretKey = new TextEncoder().encode("dummy-jwt-secret-key-for-e2e-testing");
  const jwt = await new SignJWT({ sub: did })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secretKey);

  const appSecret = process.env.APP_SESSION_SECRET || "BJ85RetJyuH0D8aAIHS-zEtkiPeLB3VRY7mTra7v59A";
  const envelope = {
    accessToken: jwt,
    expiresAt: Math.floor(Date.now() / 1000) + 7200,
  };
  const payload = Buffer.from(JSON.stringify(envelope)).toString("base64url");
  const signature = createHmac("sha256", appSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
