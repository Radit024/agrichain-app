import "server-only";
import { PGlite } from "@electric-sql/pglite";
import postgres, { type Sql } from "postgres";
import type { DbAdapter } from "../actions/invitations";

/**
 * DbAdapter runtime tunggal:
 * - DATABASE_URL ter-set → PostgreSQL server-side (produksi/hosted)
 * - selain itu → PGlite lokal (dev/test tanpa Docker; .pglite/agrichain.db)
 */

let cachedPglite: DbAdapter | null = null;
let cachedPostgres: Sql | null = null;

export async function getDbAdapter(): Promise<DbAdapter> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    cachedPostgres ??= postgres(databaseUrl, { prepare: false });
    return {
      // postgres.js tetap mengikat values sebagai parameter $1, $2, ...; query
      // aplikasi tidak boleh menginterpolasi input ke SQL string.
      query: async <T>(query: string, params: unknown[] = []) =>
        (await cachedPostgres!.unsafe(query, params as never[])) as T[],
    };
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("DATABASE_URL wajib di-set untuk akses Supabase hosted");
  }
  if (!cachedPglite) {
    const dbPath = process.env.PGLITE_PATH ?? "./.pglite/agrichain.db";
    try {
      const { existsSync, unlinkSync } = await import("node:fs");
      const { join } = await import("node:path");
      const pidFile = join(dbPath, "postmaster.pid");
      if (existsSync(pidFile)) {
        unlinkSync(pidFile);
      }
    } catch {
      // Abaikan jika fs tidak dapat diakses atau file tidak ada
    }
    const db = new PGlite(dbPath);
    cachedPglite = {
      query: async <T>(sql: string, params: unknown[] = []) =>
        (await db.query<T>(sql, params as unknown[])).rows,
    };
  }
  return cachedPglite;
}
