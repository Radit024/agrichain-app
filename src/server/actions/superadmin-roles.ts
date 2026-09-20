"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { ActionError } from "@/server/actions/errors";
import { auditLog, newCorrelationId } from "@/server/audit/log";

const VALID_ROLES = [
  "PRODUCER_ADMIN",
  "FACTORY_STAFF",
  "DISTRIBUTOR_ADMIN",
  "RETAILER_ADMIN",
  "CONTRACT_ADMIN",
] as const;

async function requireSuperadminSession() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) throw new ActionError("NOT_FOUND");

  // Di dev/test atau untuk CONTRACT_ADMIN / PRODUCER_ADMIN, perbolehkan akses
  const isAuthorized =
    process.env.NODE_ENV !== "production" ||
    session.memberships.some((m) => m.role === "CONTRACT_ADMIN" || m.role === "PRODUCER_ADMIN");

  if (!isAuthorized) {
    throw new ActionError("ROLE_REQUIRED");
  }

  return session;
}

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  role: z.enum(VALID_ROLES),
});

export async function assignUserRole(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSuperadminSession();
    const parsed = assignRoleSchema.parse(input);
    const db = await getDbAdapter();

    // Hapus role lama user di org ini jika ada (agar 1 role per org)
    await db.query(`delete from memberships where user_id = $1 and org_id = $2`, [
      parsed.userId,
      parsed.orgId,
    ]);

    // Tambah role baru
    await db.query(`insert into memberships (user_id, org_id, role) values ($1, $2, $3)`, [
      parsed.userId,
      parsed.orgId,
      parsed.role,
    ]);

    await auditLog(
      db,
      newCorrelationId(),
      "SUPERADMIN_ASSIGN_ROLE",
      {
        targetUserId: parsed.userId,
        orgId: parsed.orgId,
        newRole: parsed.role,
      },
      session.user.did,
    );

    revalidatePath("/mainapp/superadmin/roles");
    return { ok: true };
  } catch (err) {
    console.error("[assignUserRole error]:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Gagal menetapkan peran." };
  }
}

const removeMembershipSchema = z.object({
  membershipId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function removeUserMembership(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSuperadminSession();
    const parsed = removeMembershipSchema.parse(input);
    const db = await getDbAdapter();

    await db.query(`delete from memberships where id = $1`, [parsed.membershipId]);

    await auditLog(
      db,
      newCorrelationId(),
      "SUPERADMIN_REMOVE_MEMBERSHIP",
      {
        membershipId: parsed.membershipId,
        targetUserId: parsed.userId,
      },
      session.user.did,
    );

    revalidatePath("/mainapp/superadmin/roles");
    return { ok: true };
  } catch (err) {
    console.error("[removeUserMembership error]:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Gagal menghapus penugasan." };
  }
}

const updateStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["ACTIVE", "PENDING_INVITE", "REVOKED"]),
});

export async function updateUserStatus(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSuperadminSession();
    const parsed = updateStatusSchema.parse(input);
    const db = await getDbAdapter();

    await db.query(`update app_users set status = $2, updated_at = now() where id = $1`, [
      parsed.userId,
      parsed.status,
    ]);

    await auditLog(
      db,
      newCorrelationId(),
      "SUPERADMIN_UPDATE_USER_STATUS",
      {
        targetUserId: parsed.userId,
        newStatus: parsed.status,
      },
      session.user.did,
    );

    revalidatePath("/mainapp/superadmin/roles");
    return { ok: true };
  } catch (err) {
    console.error("[updateUserStatus error]:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Gagal mengubah status akun." };
  }
}

const directCreateUserSchema = z.object({
  privyDid: z.string().min(5),
  displayName: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal("")),
  walletAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional()
    .or(z.literal("")),
  orgId: z.string().uuid(),
  role: z.enum(VALID_ROLES),
});

export async function directCreateOrGrantUser(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSuperadminSession();
    const parsed = directCreateUserSchema.parse(input);
    const db = await getDbAdapter();

    const existing = await db.query<{ id: string }>(
      `select id from app_users where privy_did = $1`,
      [parsed.privyDid],
    );

    let userId: string;

    if (existing.length > 0) {
      userId = existing[0].id;
      await db.query(
        `update app_users
         set display_name = $2,
             email = coalesce($3, email),
             wallet_address = coalesce($4, wallet_address),
             status = 'ACTIVE',
             mfa_verified = true,
             updated_at = now()
         where id = $1`,
        [userId, parsed.displayName, parsed.email || null, parsed.walletAddress || null],
      );
    } else {
      const inserted = await db.query<{ id: string }>(
        `insert into app_users (privy_did, display_name, email, wallet_address, status, mfa_verified)
         values ($1, $2, $3, $4, 'ACTIVE', true)
         returning id`,
        [parsed.privyDid, parsed.displayName, parsed.email || null, parsed.walletAddress || null],
      );
      userId = inserted[0].id;
    }

    // Pasangkan ke organisasi dengan role yang dipilih
    await db.query(
      `insert into memberships (user_id, org_id, role)
       values ($1, $2, $3)
       on conflict (user_id, org_id, role) do nothing`,
      [userId, parsed.orgId, parsed.role],
    );

    await auditLog(
      db,
      newCorrelationId(),
      "SUPERADMIN_DIRECT_GRANT_USER",
      {
        targetUserId: userId,
        privyDid: parsed.privyDid,
        orgId: parsed.orgId,
        role: parsed.role,
      },
      session.user.did,
    );

    revalidatePath("/mainapp/superadmin/roles");
    return { ok: true, data: { userId } };
  } catch (err) {
    console.error("[directCreateOrGrantUser error]:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal mendaftarkan pengguna.",
    };
  }
}
