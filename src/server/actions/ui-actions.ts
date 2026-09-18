"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { registerBatch, type RegisterBatchResult } from "@/server/actions/batches";
import { cancelHandoff, confirmHandoff, initiateHandoff } from "@/server/actions/handoffs";
import { getDbAdapter } from "@/server/db/adapter";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { ActionError } from "@/server/actions/errors";

/**
 * Server Action wrappers untuk form UI: baca sesi dari cookie, inject
 * db, terjemahkan ActionError → pesan aman. Dipanggil dari Client
 * Component (Fase I).
 */

async function requireUiSession() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) throw new ActionError("NOT_FOUND");
  return session;
}

function friendly(code: string): string {
  switch (code) {
    case "INPUT_INVALID":
      return "Data yang dimasukkan belum valid. Periksa kembali isian Anda.";
    case "ROLE_REQUIRED":
    case "BATCH_FORBIDDEN":
      return "Akun ini belum memiliki akses untuk tindakan tersebut.";
    case "DUPLICATE":
      return "Kode batch sudah digunakan di organisasi ini.";
    case "NOT_FOUND":
      return "Data tidak ditemukan.";
    case "PAUSED":
      return "Pencatatan ditunda sementara.";
    case "RATE_LIMITED":
      return "Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.";
    case "MFA_REQUIRED":
      return "Verifikasi tambahan diperlukan.";
    default:
      return "Tindakan belum dapat diselesaikan. Coba lagi.";
  }
}

export interface UiActionOk<T> {
  ok: true;
  data: T;
}
export interface UiActionErr {
  ok: false;
  error: string;
}
export type UiActionResult<T> = UiActionOk<T> | UiActionErr;

function toError(e: unknown): UiActionErr {
  if (e instanceof ActionError) return { ok: false, error: friendly(e.code) };
  console.error("[ui-action]", e instanceof Error ? e.message : e);
  return { ok: false, error: "Tindakan belum dapat diselesaikan. Coba lagi." };
}

export async function uiRegisterBatch(
  input: unknown,
): Promise<UiActionResult<RegisterBatchResult>> {
  try {
    const session = await requireUiSession();
    const db = await getDbAdapter();
    const data = await registerBatch(input, db, session);
    revalidatePath("/mainapp/batch");
    revalidatePath("/mainapp/dashboard");
    return { ok: true, data };
  } catch (e) {
    return toError(e);
  }
}

export async function uiInitiateHandoff(
  input: unknown,
): Promise<UiActionResult<{ intentId: string; expiresAt: string }>> {
  try {
    const session = await requireUiSession();
    const db = await getDbAdapter();
    const data = await initiateHandoff(input, db, session);
    revalidatePath("/mainapp/serah-terima");
    revalidatePath("/mainapp/batch");
    return { ok: true, data: { intentId: data.intentId, expiresAt: data.expiresAt.toISOString() } };
  } catch (e) {
    return toError(e);
  }
}

export async function uiConfirmHandoff(
  batchId: string,
): Promise<UiActionResult<{ intentId: string }>> {
  try {
    const session = await requireUiSession();
    const db = await getDbAdapter();
    const data = await confirmHandoff(batchId, db, session);
    revalidatePath("/mainapp/serah-terima");
    revalidatePath("/mainapp/batch");
    revalidatePath(`/mainapp/batch/${batchId}`);
    return { ok: true, data: { intentId: data.intentId } };
  } catch (e) {
    return toError(e);
  }
}

export async function uiCancelHandoff(batchId: string): Promise<UiActionResult<{ ok: true }>> {
  try {
    const session = await requireUiSession();
    const db = await getDbAdapter();
    await cancelHandoff(batchId, db, session);
    revalidatePath("/mainapp/serah-terima");
    revalidatePath("/mainapp/batch");
    return { ok: true, data: { ok: true } };
  } catch (e) {
    return toError(e);
  }
}

const argon2Params = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export async function uiCreateDistributionPoint(input: {
  publicName: string;
  internalNotes?: string;
}): Promise<UiActionResult<{ id: string }>> {
  try {
    const session = await requireUiSession();
    const db = await getDbAdapter();
    const orgId = session.memberships[0]?.orgId;
    if (!orgId) throw new ActionError("ROLE_REQUIRED");
    if (!input.publicName || input.publicName.trim().length < 3) {
      throw new ActionError("INPUT_INVALID");
    }
    const rows = await db.query<{ id: string }>(
      `insert into distribution_points (org_id, public_name, internal_notes)
       values ($1, $2, $3) returning id`,
      [orgId, input.publicName.trim(), input.internalNotes?.trim() || null],
    );
    revalidatePath("/mainapp/titik-distribusi");
    return { ok: true, data: { id: rows[0].id } };
  } catch (e) {
    return toError(e);
  }
}

export async function uiAddSchedule(input: {
  pointId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}): Promise<UiActionResult<{ id: string }>> {
  try {
    const session = await requireUiSession();
    const db = await getDbAdapter();
    const orgIds = session.memberships.map((m) => m.orgId);
    const pt = await db.query<{ id: string }>(
      `select id from distribution_points where id = $1 and org_id = any($2::uuid[])`,
      [input.pointId, orgIds],
    );
    if (pt.length === 0) throw new ActionError("NOT_FOUND");
    if (input.weekday < 0 || input.weekday > 6 || !input.startTime || !input.endTime) {
      throw new ActionError("INPUT_INVALID");
    }
    const rows = await db.query<{ id: string }>(
      `insert into distribution_point_schedules (point_id, weekday, start_time, end_time)
       values ($1, $2, $3, $4) returning id`,
      [input.pointId, input.weekday, input.startTime, input.endTime],
    );
    revalidatePath("/mainapp/titik-distribusi");
    return { ok: true, data: { id: rows[0].id } };
  } catch (e) {
    return toError(e);
  }
}

export async function uiDeleteSchedule(scheduleId: string): Promise<UiActionResult<{ ok: true }>> {
  try {
    const session = await requireUiSession();
    const db = await getDbAdapter();
    const orgIds = session.memberships.map((m) => m.orgId);
    await db.query(
      `delete from distribution_point_schedules s
       using distribution_points p
       where s.id = $1 and s.point_id = p.id and p.org_id = any($2::uuid[])`,
      [scheduleId, orgIds],
    );
    revalidatePath("/mainapp/titik-distribusi");
    return { ok: true, data: { ok: true } };
  } catch (e) {
    return toError(e);
  }
}

export async function uiCreateAccessCode(input: {
  batchId: string;
  pointId: string;
  rawCode: string;
  validFrom: string;
  validUntil: string;
}): Promise<UiActionResult<{ id: string }>> {
  try {
    const { hash } = await import("@node-rs/argon2");
    const session = await requireUiSession();
    const db = await getDbAdapter();
    const orgIds = session.memberships.map((m) => m.orgId);

    const b = await db.query<{ id: string }>(
      `select id from batches where id = $1 and org_id = any($2::uuid[])`,
      [input.batchId, orgIds],
    );
    if (b.length === 0) throw new ActionError("NOT_FOUND");

    const pt = await db.query<{ id: string }>(
      `select id from distribution_points where id = $1 and org_id = any($2::uuid[])`,
      [input.pointId, orgIds],
    );
    if (pt.length === 0) throw new ActionError("NOT_FOUND");

    if (!input.rawCode || input.rawCode.length < 6) {
      throw new ActionError("INPUT_INVALID");
    }
    const from = new Date(input.validFrom);
    const until = new Date(input.validUntil);
    if (isNaN(from.getTime()) || isNaN(until.getTime()) || until <= from) {
      throw new ActionError("INPUT_INVALID");
    }

    const codeHash = await hash(input.rawCode, argon2Params);

    const rows = await db.query<{ id: string }>(
      `insert into access_codes (batch_id, point_id, code_hash, valid_from, valid_until)
       values ($1, $2, $3, $4, $5) returning id`,
      [input.batchId, input.pointId, codeHash, from.toISOString(), until.toISOString()],
    );
    revalidatePath("/mainapp/titik-distribusi");
    revalidatePath("/mainapp/batch");
    revalidatePath(`/mainapp/batch/${input.batchId}`);
    return { ok: true, data: { id: rows[0].id } };
  } catch (e) {
    return toError(e);
  }
}
