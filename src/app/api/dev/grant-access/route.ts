import { NextResponse } from "next/server";
import { z } from "zod";
import { getDbAdapter } from "@/server/db/adapter";
import { getRequestAccessToken } from "@/server/auth/request-session";
import { verifyPrivyAccessToken } from "@/server/auth/privy";
import {
  APP_SESSION_COOKIE,
  appSessionCookieOptions,
  createAppSession,
} from "@/server/auth/app-session";

export const runtime = "nodejs";

/**
 * TITIK MASUK DEV-ONLY (skripsi): memberi akses langsung ke akun yang sedang
 * login tanpa alur undangan — equivalent manual "jalur 2":
 *   insert app_users ... status = 'ACTIVE';
 *   insert memberships (user_id, org_id, role);
 * DID diambil dari token Bearer terverifikasi, bukan input klien, sehingga
 * user tidak bisa memberi akses ke DID orang lain. Tidak aktif di produksi.
 */

const grantSchema = z.object({
  orgId: z.string().uuid().optional(),
  role: z
    .enum([
      "PRODUCER_ADMIN",
      "FACTORY_STAFF",
      "DISTRIBUTOR_ADMIN",
      "RETAILER_ADMIN",
      "CONTRACT_ADMIN",
    ])
    .optional(),
  displayName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Tidak tersedia di produksi." }, { status: 404 });
  }

  try {
    const accessToken = getRequestAccessToken(request);
    if (!accessToken) throw new Error("missing token");
    const { did } = await verifyPrivyAccessToken(accessToken);

    const body = await request.json().catch(() => ({}));
    const { orgId, role, displayName, email } = grantSchema.parse(body);

    const db = await getDbAdapter();
    const orgUuid = orgId ?? "11111111-1111-1111-1111-111111111111";
    const roleValue = role ?? "PRODUCER_ADMIN";
    const nameValue = displayName ?? "Pengguna Dev";

    const existing = await db.query<{ id: string }>(
      "select id from app_users where privy_did = $1",
      [did],
    );
    let userId: string;
    if (existing.length > 0) {
      userId = existing[0].id;
      await db.query(
        "update app_users set status = 'ACTIVE', display_name = $2, email = coalesce($3, email), updated_at = now() where id = $1",
        [userId, nameValue, email ?? null],
      );
    } else {
      const inserted = await db.query<{ id: string }>(
        `insert into app_users (privy_did, display_name, email, status, mfa_verified)
         values ($1,$2,$3,'ACTIVE',true) returning id`,
        [did, nameValue, email ?? null],
      );
      userId = inserted[0].id;
    }

    await db.query(
      `insert into memberships (user_id, org_id, role) values ($1,$2,$3)
       on conflict (user_id, org_id, role) do nothing`,
      [userId, orgUuid, roleValue],
    );

    const { token } = await createAppSession(accessToken);
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(APP_SESSION_COOKIE, token, appSessionCookieOptions);
    return response;
  } catch {
    return NextResponse.json({ error: "Akses tidak dapat diberikan." }, { status: 400 });
  }
}
