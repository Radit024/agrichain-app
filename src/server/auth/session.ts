import "server-only";
import { verifyPrivyAccessToken, extractBearerToken, PrivyAuthError } from "./privy";
import { z } from "zod";

/**
 * Session layer (IMPLEMENTATION-PLAN §6.1): verifikasi token Privy
 * → join app_users + memberships via service-role.
 * Kontrol akses data access layer — UI hanya pengalaman.
 */

export interface Membership {
  orgId: string;
  orgName: string;
  role:
    "PRODUCER_ADMIN" | "FACTORY_STAFF" | "DISTRIBUTOR_ADMIN" | "RETAILER_ADMIN" | "CONTRACT_ADMIN";
}

export interface Session {
  user: {
    id: string;
    did: string;
    displayName: string;
    email: string | null;
    walletAddress: string | null;
    mfaVerified: boolean;
    status: "PENDING_INVITE" | "ACTIVE" | "REVOKED";
  };
  memberships: Membership[];
}

export class AuthError extends Error {
  constructor(
    public code:
      | "SESSION_INVALID"
      | "SESSION_EXPIRED"
      | "NO_ACCESS"
      | "ROLE_REQUIRED"
      | "BATCH_FORBIDDEN"
      | "MFA_REQUIRED",
  ) {
    super(code);
    this.name = "AuthError";
  }
}

/** Query membership — dipisah agar test bisa meng-inject PGlite/impl lain. */
export interface UserDirectory {
  findUserByDid(did: string): Promise<Session["user"] | null>;
  findMemberships(userId: string): Promise<Membership[]>;
}

/**
 * Verifikasi sesi lengkap dari header Authorization.
 * Urutan: token → Privy verify → user di app_users (ACTIVE) → memberships.
 */
export async function requireSession(
  authHeader: string | null | undefined,
  directory: UserDirectory,
): Promise<Session> {
  const token = extractBearerToken(authHeader);
  if (!token) throw new AuthError("SESSION_INVALID");

  let privyUser;
  try {
    privyUser = await verifyPrivyAccessToken(token);
  } catch (e) {
    if (e instanceof PrivyAuthError) throw new AuthError("SESSION_INVALID");
    throw e;
  }

  const user = await directory.findUserByDid(privyUser.did);
  if (!user) throw new AuthError("NO_ACCESS");
  if (user.status !== "ACTIVE") throw new AuthError("NO_ACCESS");

  const memberships = await directory.findMemberships(user.id);
  return { user, memberships };
}

/** Sesi + wajib punya salah satu role. */
export async function requireRole(
  authHeader: string | null | undefined,
  directory: UserDirectory,
  roles: Membership["role"][],
): Promise<Session> {
  const session = await requireSession(authHeader, directory);
  if (!session.memberships.some((m) => roles.includes(m.role))) {
    throw new AuthError("ROLE_REQUIRED");
  }
  return session;
}

/** Mutasi sensitif (PRD story 31): tolak bila MFA belum diverifikasi. */
export function assertMfa(session: Session): void {
  if (!session.user.mfaVerified) throw new AuthError("MFA_REQUIRED");
}

/** IDOR/BOLA guard: batch harus milik org tempat user bermembership. */
export function assertBatchOrg(batchOrgId: string, session: Session): void {
  if (!session.memberships.some((m) => m.orgId === batchOrgId)) {
    throw new AuthError("BATCH_FORBIDDEN");
  }
}

/** Skema input umum undangan. */
export const invitationSchema = z.object({
  email: z.string().email(),
  orgId: z.string().uuid(),
  role: z.enum([
    "PRODUCER_ADMIN",
    "FACTORY_STAFF",
    "DISTRIBUTOR_ADMIN",
    "RETAILER_ADMIN",
    "CONTRACT_ADMIN",
  ]),
});
