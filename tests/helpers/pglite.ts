import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS = [
  "0001_core_schema.sql",
  "0002_rls_grants.sql",
  "0003_invitation_revocation.sql",
];
const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Harness PGlite in-process untuk test migrasi + RLS tanpa Docker.
 * Mengemulasi role Supabase (anon/authenticated) via SET LOCAL ROLE
 * dalam satu transaction (aman dari race antar-query).
 */
export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  // Role ala Supabase — harus ada sebelum migrasi 002 melakukan REVOKE
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
  for (const file of MIGRATIONS) {
    const sql = await readFile(path.resolve(HERE, "../../supabase/migrations", file), "utf8");
    await db.exec(sql);
  }
  return db;
}

/**
 * Jalankan query sebagai role tertentu (anon/authenticated).
 * SET LOCAL ROLE dalam transaction tunggal → role hanya berlaku di
 * dalam BEGIN..COMMIT itu dan tidak bocor antar query.
 * Melempar error Postgres apa adanya (permission denied dsb).
 */
export async function asRole<T = Record<string, unknown>>(
  db: PGlite,
  role: "anon" | "authenticated",
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${role}`);
    const result = await db.query<T>(sql, params as unknown[]);
    return result.rows;
  } finally {
    await db.exec("commit");
  }
}

/** Superuser/service-role: bypass RLS. */
export async function asService<T = Record<string, unknown>>(
  db: PGlite,
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await db.query<T>(sql, params as unknown[]);
  return result.rows;
}
