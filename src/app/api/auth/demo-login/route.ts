import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createHmac } from "node:crypto";
import { APP_SESSION_COOKIE, appSessionCookieOptions } from "@/server/auth/app-session";

export const runtime = "nodejs";

const DEMO_ACCOUNTS = {
  PRODUCER_ADMIN: {
    did: "did:privy:seed:producer-admin",
    name: "Budi Pratama (Admin Produsen)",
    org: "PT Agrichain Prima Agro",
    role: "PRODUCER_ADMIN",
  },
  DISTRIBUTOR_ADMIN: {
    did: "did:privy:seed:distributor-admin",
    name: "Siti Rahma (Logistik Distributor)",
    org: "PT Sentral Logistik Rantai Dingin",
    role: "DISTRIBUTOR_ADMIN",
  },
  RETAILER_ADMIN: {
    did: "did:privy:seed:retailer-admin",
    name: "Hendra Wijaya (Store Manager Retailer)",
    org: "Segar Mart Retail Indonesia",
    role: "RETAILER_ADMIN",
  },
  FACTORY_STAFF: {
    did: "did:privy:seed:factory-staff",
    name: "Ahmad Fauzi (Petugas Pabrik)",
    org: "PT Agrichain Prima Agro",
    role: "FACTORY_STAFF",
  },
} as const;

type RoleKey = keyof typeof DEMO_ACCOUNTS;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedRole = (body?.role as RoleKey) || "PRODUCER_ADMIN";
    const account = DEMO_ACCOUNTS[requestedRole] ?? DEMO_ACCOUNTS.PRODUCER_ADMIN;

    const secretKey = new TextEncoder().encode("agrichain-demo-showcase-secret-key-32b");
    const jwt = await new SignJWT({ sub: account.did, role: account.role })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secretKey);

    const appSecret =
      process.env.APP_SESSION_SECRET || "BJ85RetJyuH0D8aAIHS-zEtkiPeLB3VRY7mTra7v59A";
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24 jam

    const envelope = { accessToken: jwt, expiresAt };
    const payload = Buffer.from(JSON.stringify(envelope)).toString("base64url");
    const signature = createHmac("sha256", appSecret).update(payload).digest("base64url");
    const token = `${payload}.${signature}`;

    const response = NextResponse.json({
      success: true,
      user: {
        name: account.name,
        org: account.org,
        role: account.role,
      },
      redirect: "/mainapp/dashboard",
    });

    response.cookies.set(APP_SESSION_COOKIE, token, {
      ...appSessionCookieOptions,
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("[demo-login error]:", error);
    return NextResponse.json(
      { error: "Gagal membuat sesi akun demo.", details: String(error) },
      { status: 500 },
    );
  }
}
