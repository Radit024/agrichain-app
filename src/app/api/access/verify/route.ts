import { NextResponse } from "next/server";
import { verifyAccess } from "@/server/actions/access";
import { requireSession, type UserDirectory } from "@/server/auth/session";
import { getDbAdapter } from "@/server/db/adapter";

export const runtime = "nodejs";

/** POST /api/access/verify — verifikasi kode petugas (autentikasi Privy wajib). */
export async function POST(req: Request) {
  let session;
  try {
    const directory: UserDirectory = {
      findUserByDid: async (did) => {
        const db = await getDbAdapter();
        const rows = await db.query<{
          id: string;
          privy_did: string;
          display_name: string;
          email: string | null;
          wallet_address: string | null;
          mfa_verified: boolean;
          status: string;
        }>(
          "select id, privy_did, display_name, email, wallet_address, mfa_verified, status from app_users where privy_did = $1",
          [did],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          did: r.privy_did,
          displayName: r.display_name,
          email: r.email,
          walletAddress: r.wallet_address,
          mfaVerified: r.mfa_verified,
          status: r.status as "PENDING_INVITE" | "ACTIVE" | "REVOKED",
        };
      },
      findMemberships: async (userId) => {
        const db = await getDbAdapter();
        const rows = await db.query<{ org_id: string; org_name: string; role: string }>(
          `select m.org_id, o.name as org_name, m.role
           from memberships m join orgs o on o.id = m.org_id where m.user_id = $1`,
          [userId],
        );
        return rows.map((r) => ({
          orgId: r.org_id,
          orgName: r.org_name,
          role: r.role as never,
        }));
      },
    };
    session = await requireSession(req.headers.get("authorization"), directory);
  } catch {
    return NextResponse.json(
      { result: "TIDAK_SAH", reason: "Sesi berakhir. Masuk kembali untuk melanjutkan." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const db = await getDbAdapter();
  const result = await verifyAccess(body, db, session, ip);
  return NextResponse.json(result);
}
