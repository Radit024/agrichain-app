import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Klien Supabase service-role — SERVER-ONLY.
 * Secret tidak pernah sampai browser. Semua akses data internal
 * melewati layer ini setelah verifikasi Privy + rate limit.
 */
let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib di-set di lingkungan server");
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
