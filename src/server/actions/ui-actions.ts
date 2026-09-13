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
    revalidatePath("/batch");
    revalidatePath("/dashboard");
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
    revalidatePath("/serah-terima");
    revalidatePath("/batch");
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
    revalidatePath("/serah-terima");
    revalidatePath("/batch");
    revalidatePath(`/batch/${batchId}`);
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
    revalidatePath("/serah-terima");
    revalidatePath("/batch");
    return { ok: true, data: { ok: true } };
  } catch (e) {
    return toError(e);
  }
}
