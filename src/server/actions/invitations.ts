"use server";

import { hash, verify } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { PGlite } from "@electric-sql/pglite";

/**
 * Undangan & aktivasi akun internal (IMPLEMENTATION-PLAN §6.2) — invite-only.
 * Token undangan: Argon2id hash di DB; token mentah hanya diketahui penerima
 * (ditampilkan admin lokal untuk skripsi — email out-of-scope).
 */

const argon2Params = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export interface DbAdapter {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

/** Wrapper PGlite → DbAdapter (dev/test). */
export function pgliteAdapter(db: PGlite): DbAdapter {
  return {
    query: async <T>(sql: string, params: unknown[] = []) =>
      (await db.query<T>(sql, params as unknown[])).rows,
  };
}

export class InviteError extends Error {
  constructor(
    public code: "INVALID" | "EXPIRED" | "ALREADY_USED" | "EMAIL_MISMATCH" | "DID_EXISTS",
  ) {
    super(code);
    this.name = "InviteError";
  }
}

const createInviteSchema = z.object({
  email: z.string().email(),
  orgId: z.string().uuid(),
  role: z.enum([
    "PRODUCER_ADMIN",
    "FACTORY_STAFF",
    "DISTRIBUTOR_ADMIN",
    "RETAILER_ADMIN",
    "CONTRACT_ADMIN",
  ]),
  createdByUserId: z.string().uuid(),
  ttlHours: z.number().int().min(1).max(168).default(48),
});

export interface CreatedInvite {
  invitationId: string;
  /** Token mentah — SAAT INI untuk skripsi: dikembalikan ke admin untuk dibagikan manual. */
  rawToken: string;
  expiresAt: Date;
}

/** Admin membuat undangan; mengembalikan token mentah sekali saja. */
export async function createInvitation(input: unknown, db: DbAdapter): Promise<CreatedInvite> {
  const parsed = createInviteSchema.parse(input);
  const rawToken = randomBytes(24).toString("base64url");
  const tokenHash = await hash(rawToken, argon2Params);
  const expiresAt = new Date(Date.now() + parsed.ttlHours * 3600_000);

  const rows = await db.query<{ id: string }>(
    `insert into invitations (email, org_id, role, invitation_token_hash, expires_at, created_by)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (email, org_id, role) do update set
       invitation_token_hash = excluded.invitation_token_hash,
       expires_at = excluded.expires_at,
       accepted_at = null
     returning id`,
    [
      parsed.email,
      parsed.orgId,
      parsed.role,
      tokenHash,
      expiresAt.toISOString(),
      parsed.createdByUserId,
    ],
  );
  return {
    invitationId: rows[0].id,
    rawToken,
    expiresAt,
  };
}

export interface ActivationInput {
  token: string;
  email: string;
  privyDid: string;
  displayName: string;
  walletAddress?: string;
}

/** Verifikasi token undangan (hash) + buat app_users + memberships. */
export async function acceptInvitation(
  input: ActivationInput,
  db: DbAdapter,
): Promise<{ userId: string; orgId: string; role: string }> {
  const schema = z.object({
    token: z.string().min(16).max(128),
    email: z.string().email(),
    privyDid: z.string().min(8),
    displayName: z.string().min(2).max(100),
    walletAddress: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/)
      .optional(),
  });
  const parsed = schema.parse(input);

  const invites = await db.query<{
    id: string;
    org_id: string;
    role: string;
    invitation_token_hash: string;
    expires_at: string;
    accepted_at: string | null;
    email: string;
  }>(
    `select id, org_id, role, invitation_token_hash, expires_at, accepted_at, email
     from invitations where lower(email) = lower($1) and accepted_at is null`,
    [parsed.email],
  );

  let matched: (typeof invites)[number] | null = null;
  for (const inv of invites) {
    if (await verify(inv.invitation_token_hash, parsed.token)) {
      matched = inv;
      break;
    }
  }
  if (!matched) throw new InviteError("INVALID");
  if (new Date(matched.expires_at) <= new Date()) throw new InviteError("EXPIRED");
  if (matched.accepted_at) throw new InviteError("ALREADY_USED");

  // cek DID sudah terdaftar
  const existing = await db.query<{ id: string }>("select id from app_users where privy_did = $1", [
    parsed.privyDid,
  ]);
  let userId: string;
  if (existing.length > 0) {
    userId = existing[0].id;
    await db.query(
      "update app_users set status = 'ACTIVE', display_name = $2, wallet_address = coalesce($3, wallet_address), updated_at = now() where id = $1",
      [userId, parsed.displayName, parsed.walletAddress ?? null],
    );
  } else {
    const inserted = await db.query<{ id: string }>(
      `insert into app_users (privy_did, display_name, email, wallet_address, status)
       values ($1,$2,$3,$4,'ACTIVE') returning id`,
      [parsed.privyDid, parsed.displayName, parsed.email, parsed.walletAddress ?? null],
    );
    userId = inserted[0].id;
  }

  await db.query(
    `insert into memberships (user_id, org_id, role) values ($1,$2,$3)
     on conflict (user_id, org_id, role) do nothing`,
    [userId, matched.org_id, matched.role],
  );
  await db.query("update invitations set accepted_at = now() where id = $1", [matched.id]);

  return { userId, orgId: matched.org_id, role: matched.role };
}
