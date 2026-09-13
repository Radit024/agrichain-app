import "server-only";
import { PGlite } from "@electric-sql/pglite";
import type { DbAdapter } from "../actions/invitations";

/**
 * DbAdapter runtime tunggal:
 * - SUPABASE_SERVICE_ROLE_KEY ter-set → adapter supabase-js (produksi/hosted)
 * - selain itu → PGlite lokal (dev/test tanpa Docker; .pglite/agrichain.db)
 */

let cachedPglite: DbAdapter | null = null;

export async function getDbAdapter(): Promise<DbAdapter> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_URL?.includes("http")) {
    const { getSupabase } = await import("./supabase");
    const sb = getSupabase();
    return {
      query: async <T>(sql: string, params: unknown[] = []) => {
        // Data API tidak mendukung raw SQL — host produksi menjalankan Postgres
        // penuh; exec_sql adalah RPC helper yang didefinisikan di migrasi hosted.
        const { data, error } = await sb.rpc("exec_sql", { q: sql, p: params });
        if (error) throw new Error(error.message);
        return (data ?? []) as T[];
      },
    };
  }
  if (!cachedPglite) {
    const db = new PGlite(process.env.PGLITE_PATH ?? "./.pglite/agrichain.db");
    cachedPglite = {
      query: async <T>(sql: string, params: unknown[] = []) =>
        (await db.query<T>(sql, params as unknown[])).rows,
    };
  }
  return cachedPglite;
}
