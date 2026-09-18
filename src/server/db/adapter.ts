import "server-only";
import { PGlite } from "@electric-sql/pglite";
import postgres, { type Sql } from "postgres";
import type { DbAdapter } from "../actions/invitations";

/**
 * DbAdapter runtime tunggal:
 * - DATABASE_URL ter-set → PostgreSQL server-side (produksi/hosted)
 * - selain itu → PGlite lokal (dev/test tanpa Docker; .pglite/agrichain.db)
 */

interface GlobalDbState {
  pgliteAdapter?: DbAdapter;
  pgliteInitPromise?: Promise<DbAdapter>;
  postgres?: Sql;
}

const globalDb = globalThis as unknown as GlobalDbState;

async function cleanPidFile(dbPath: string) {
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
}

async function runMigrationsIfEmpty(db: PGlite) {
  try {
    const check = await db.query<{ exists: boolean }>(
      "select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'app_users') as exists",
    );
    if (check.rows[0]?.exists) return;

    await db.exec(`
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'anon') then
          create role anon nologin;
        end if;
        if not exists (select 1 from pg_roles where rolname = 'authenticated') then
          create role authenticated nologin;
        end if;
      end $$;
    `);

    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const migrations = [
      "0001_core_schema.sql",
      "0002_rls_grants.sql",
      "0003_invitation_revocation.sql",
    ];
    for (const file of migrations) {
      const sql = await readFile(resolve(process.cwd(), "supabase/migrations", file), "utf8");
      await db.exec(sql);
    }
  } catch (err) {
    console.warn("[getDbAdapter] Gagal menjalankan migrasi otomatis:", err);
  }
}

async function initPglite(): Promise<DbAdapter> {
  const dbPath = process.env.PGLITE_PATH ?? "./.pglite/agrichain.db";
  await cleanPidFile(dbPath);

  let db: PGlite;
  try {
    db = new PGlite(dbPath);
    await db.waitReady;
  } catch (err) {
    console.warn(
      "[getDbAdapter] PGlite gagal dimulai (kemungkinan korup), melakukan pemulihan otomatis:",
      err,
    );
    try {
      const { rm, mkdir } = await import("node:fs/promises");
      await rm(dbPath, { recursive: true, force: true });
      await mkdir(dbPath, { recursive: true });
      db = new PGlite(dbPath);
      await db.waitReady;
    } catch (recoveryErr) {
      console.error("[getDbAdapter] Pemulihan PGlite gagal:", recoveryErr);
      throw err;
    }
  }

  await runMigrationsIfEmpty(db);

  const adapter: DbAdapter = {
    query: async <T>(sql: string, params: unknown[] = []) =>
      (await db.query<T>(sql, params as unknown[])).rows,
  };

  globalDb.pgliteAdapter = adapter;
  return adapter;
}

export async function getDbAdapter(): Promise<DbAdapter> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    globalDb.postgres ??= postgres(databaseUrl, { prepare: false });
    return {
      // postgres.js tetap mengikat values sebagai parameter $1, $2, ...; query
      // aplikasi tidak boleh menginterpolasi input ke SQL string.
      query: async <T>(query: string, params: unknown[] = []) =>
        (await globalDb.postgres!.unsafe(query, params as never[])) as T[],
    };
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("DATABASE_URL wajib di-set untuk akses Supabase hosted");
  }

  if (globalDb.pgliteAdapter) {
    return globalDb.pgliteAdapter;
  }

  if (!globalDb.pgliteInitPromise) {
    globalDb.pgliteInitPromise = initPglite().catch((err) => {
      globalDb.pgliteInitPromise = undefined;
      throw err;
    });
  }

  return await globalDb.pgliteInitPromise;
}
