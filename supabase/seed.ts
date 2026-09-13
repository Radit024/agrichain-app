/**
 * Seed deterministik (IMPLEMENTATION-PLAN §4.3) — jalankan via:
 *   npm run seed        (PGlite lokal: ./.pglite/agrichain.db)
 *
 * Catatan skripsi: ambang INDIKATIF — nilai rujukan primer SNI/BPOM
 * belum dikunci (K12). Semua data berlabel SIMULATOR.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hash } from "@node-rs/argon2";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.resolve(HERE, "../.pglite");
const DB_PATH = path.join(DB_DIR, "agrichain.db");

const argon2Params = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

// ---- UUID deterministik agar seed bisa diulang ----
const U = {
  orgProducer: "11111111-1111-1111-1111-111111111111",
  orgDistributor: "22222222-2222-2222-2222-222222222222",
  orgRetailer: "33333333-3333-3333-3333-333333333333",
  catCold: "44444444-4444-4444-4444-444444444441",
  catNonCold: "44444444-4444-4444-4444-444444444442",
  profileColdV1: "55555555-5555-5555-5555-555555555551",
  profileNonColdV1: "55555555-5555-5555-5555-555555555552",
  userProducerAdmin: "66666666-6666-6666-6666-666666666661",
  userDistributorAdmin: "66666666-6666-6666-6666-666666666662",
  userRetailerAdmin: "66666666-6666-6666-6666-666666666663",
  userFactoryStaff: "66666666-6666-6666-6666-666666666664",
  pointDcJakarta: "77777777-7777-7777-7777-777777777771",
  pointRetailSegar: "77777777-7777-7777-7777-777777777772",
  batchCold1: "88888888-8888-8888-8888-888888888881",
  batchCold2: "88888888-8888-8888-8888-888888888882",
  batchNonCold1: "88888888-8888-8888-8888-888888888883",
} as const;

async function main() {
  await mkdir(DB_DIR, { recursive: true });
  const db = new PGlite(DB_PATH);
  // Reset deterministik: seed harus selalu menghasilkan state identik
  await db.exec(`
    drop schema if exists public cascade;
    create schema public;
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
    end $$;
  `);
  for (const file of [
    "0001_core_schema.sql",
    "0002_rls_grants.sql",
    "0003_invitation_revocation.sql",
  ]) {
    const sql = await readFile(path.resolve(HERE, "migrations", file), "utf8");
    await db.exec(sql);
  }

  await db.exec("begin");
  try {
    // ---- orgs ----
    await db.exec(`
      insert into orgs (id, name, kind) values
        ('${U.orgProducer}','Pabrik Susu Makmur','PRODUCER'),
        ('${U.orgDistributor}','Distributor Sentral','DISTRIBUTOR'),
        ('${U.orgRetailer}','Retailer Segar Mart','RETAILER')
      on conflict (id) do nothing;
    `);

    // ---- parameter definitions ----
    await db.exec(`
      insert into monitoring_parameter_definitions (code, unit, value_kind) values
        ('TEMPERATURE','°C','NUMBER'),
        ('HUMIDITY','%RH','NUMBER'),
        ('SHOCK_LEVEL','g','NUMBER'),
        ('DOOR_OPEN_DURATION','detik','NUMBER')
      on conflict (code) do nothing;
    `);

    // ---- kategori: satu COLD_CHAIN + satu NON_COLD_CHAIN (K12) ----
    await db.exec(`
      insert into product_categories (id, org_id, name, handling_mode) values
        ('${U.catCold}','${U.orgProducer}','Susu Pasteurisasi','COLD_CHAIN'),
        ('${U.catNonCold}','${U.orgProducer}','Snack Kering','NON_COLD_CHAIN')
      on conflict (id) do nothing;
    `);

    // ---- profil berversi (INDIKATIF — belum dikunci, K12) ----
    await db.exec(`
      insert into monitoring_profiles (id, category_id, version, is_locked, stale_after_seconds) values
        ('${U.profileColdV1}','${U.catCold}',1,false,900),
        ('${U.profileNonColdV1}','${U.catNonCold}',1,false,1800)
      on conflict (id) do nothing;
    `);

    // COLD_CHAIN: TEMPERATURE & HUMIDITY CRITICAL (2–6 °C, 40–80 %RH, toleransi 900s),
    // DOOR_OPEN_DURATION WARNING, SHOCK_LEVEL WARNING
    // PPM: 2°C=2_000_000, 6°C=6_000_000, 40%=40_000_000, 80%=80_000_000
    await db.exec(`
      insert into profile_parameter_rules
        (profile_id, parameter_code, required, min_value_ppm, max_value_ppm, tolerance_seconds, severity) values
        ('${U.profileColdV1}','TEMPERATURE',true, 2000000, 6000000, 900,'CRITICAL'),
        ('${U.profileColdV1}','HUMIDITY',false,40000000,80000000, 900,'CRITICAL'),
        ('${U.profileColdV1}','DOOR_OPEN_DURATION',false,0,30000000,null,'WARNING'),
        ('${U.profileColdV1}','SHOCK_LEVEL',false,null,2000000,null,'WARNING')
      on conflict (profile_id, parameter_code) do nothing;
    `);
    // NON_COLD_CHAIN: HUMIDITY CRITICAL (≤70%), SHOCK CRITICAL (≤2g), TEMPERATURE CONTEXT
    await db.exec(`
      insert into profile_parameter_rules
        (profile_id, parameter_code, required, min_value_ppm, max_value_ppm, tolerance_seconds, severity) values
        ('${U.profileNonColdV1}','HUMIDITY',true, null,70000000, 1800,'CRITICAL'),
        ('${U.profileNonColdV1}','SHOCK_LEVEL',false,null,2000000,null,'CRITICAL'),
        ('${U.profileNonColdV1}','TEMPERATURE',false,null,null,null,'CONTEXT')
      on conflict (profile_id, parameter_code) do nothing;
    `);

    // ---- users (Privy DID dummy untuk skripsi; wallet embedded dummy) ----
    await db.exec(`
      insert into app_users (id, privy_did, display_name, email, wallet_address, status, mfa_verified) values
        ('${U.userProducerAdmin}','did:privy:seed:producer-admin','Admin Produsen','producer@agrichain.test','0x1aaaaaaa00000000000000000000000000000001','ACTIVE',true),
        ('${U.userDistributorAdmin}','did:privy:seed:distributor-admin','Admin Distributor','distributor@agrichain.test','0x1aaaaaaa00000000000000000000000000000002','ACTIVE',true),
        ('${U.userRetailerAdmin}','did:privy:seed:retailer-admin','Admin Retailer','retailer@agrichain.test','0x1aaaaaaa00000000000000000000000000000003','ACTIVE',true),
        ('${U.userFactoryStaff}','did:privy:seed:factory-staff','Petugas Pabrik','staff@agrichain.test','0x1aaaaaaa00000000000000000000000000000004','ACTIVE',false)
      on conflict (id) do nothing;
    `);
    await db.exec(`
      insert into memberships (user_id, org_id, role) values
        ('${U.userProducerAdmin}','${U.orgProducer}','PRODUCER_ADMIN'),
        ('${U.userDistributorAdmin}','${U.orgDistributor}','DISTRIBUTOR_ADMIN'),
        ('${U.userRetailerAdmin}','${U.orgRetailer}','RETAILER_ADMIN'),
        ('${U.userFactoryStaff}','${U.orgProducer}','FACTORY_STAFF')
      on conflict (user_id, org_id, role) do nothing;
    `);

    // ---- titik distribusi + jadwal + penugasan ----
    await db.exec(`
      insert into distribution_points (id, org_id, public_name, internal_notes) values
        ('${U.pointDcJakarta}','${U.orgDistributor}','DC Jakarta Barat','Gudang Jl. Merdeka 12, akses dok 3'),
        ('${U.pointRetailSegar}','${U.orgRetailer}','Toko Segar Mart Pusat','Jl. Sudirman 45')
      on conflict (id) do nothing;
    `);
    await db.exec(`
      insert into distribution_point_schedules (point_id, weekday, start_time, end_time) values
        ('${U.pointDcJakarta}',1,'08:00','17:00'),
        ('${U.pointDcJakarta}',2,'08:00','17:00'),
        ('${U.pointDcJakarta}',3,'08:00','17:00'),
        ('${U.pointRetailSegar}',1,'09:00','21:00'),
        ('${U.pointRetailSegar}',2,'09:00','21:00')
      on conflict (point_id, weekday, start_time) do nothing;
    `);
    await db.exec(`
      insert into point_assignments (user_id, point_id) values
        ('${U.userDistributorAdmin}','${U.pointDcJakarta}'),
        ('${U.userRetailerAdmin}','${U.pointRetailSegar}')
      on conflict (user_id, point_id) do nothing;
    `);

    // ---- 3 batch (public_id tetap untuk demo QR) ----
    const snapCold = JSON.stringify({
      handlingMode: "COLD_CHAIN",
      version: 1,
      staleAfterSeconds: 900,
      rules: [
        {
          code: "TEMPERATURE",
          unit: "°C",
          required: true,
          min: 2000000,
          max: 6000000,
          toleranceSeconds: 900,
          severity: "CRITICAL",
        },
        {
          code: "HUMIDITY",
          unit: "%RH",
          required: false,
          min: 40000000,
          max: 80000000,
          toleranceSeconds: 900,
          severity: "CRITICAL",
        },
        {
          code: "DOOR_OPEN_DURATION",
          unit: "detik",
          required: false,
          max: 30000000,
          severity: "WARNING",
        },
        { code: "SHOCK_LEVEL", unit: "g", required: false, max: 2000000, severity: "WARNING" },
      ],
    });
    const snapNonCold = JSON.stringify({
      handlingMode: "NON_COLD_CHAIN",
      version: 1,
      staleAfterSeconds: 1800,
      rules: [
        {
          code: "HUMIDITY",
          unit: "%RH",
          required: true,
          max: 70000000,
          toleranceSeconds: 1800,
          severity: "CRITICAL",
        },
        { code: "SHOCK_LEVEL", unit: "g", required: false, max: 2000000, severity: "CRITICAL" },
        { code: "TEMPERATURE", unit: "°C", required: false, severity: "CONTEXT" },
      ],
    });
    await db.exec(`
      insert into batches
        (id, org_id, category_id, profile_id, batch_code, public_id, distribution_status,
         condition_status, data_quality_status, custody_stage, custodian_wallet, custodian_org_id,
         profile_snapshot, chain_sync_status, chain_batch_key) values
        ('${U.batchCold1}','${U.orgProducer}','${U.catCold}','${U.profileColdV1}',
         'BATCH-2026-0001','AG23-7QXB-KF4M-9R2T','DIDAFTARKAN','NOT_EVALUATED','AVAILABLE',0,
         '0x1aaaaaaa00000000000000000000000000000001','${U.orgProducer}',
         '${snapCold.replace(/'/g, "''")}'::jsonb,'PENDING','seed-key-cold-1'),
        ('${U.batchCold2}','${U.orgProducer}','${U.catCold}','${U.profileColdV1}',
         'BATCH-2026-0002','BM34-8RYC-LG5N-0S3U','DIDAFTARKAN','NOT_EVALUATED','AVAILABLE',0,
         '0x1aaaaaaa00000000000000000000000000000001','${U.orgProducer}',
         '${snapCold.replace(/'/g, "''")}'::jsonb,'PENDING','seed-key-cold-2'),
        ('${U.batchNonCold1}','${U.orgProducer}','${U.catNonCold}','${U.profileNonColdV1}',
         'BATCH-2026-0003','CN45-9SZD-MH6P-1T4V','DIDAFTARKAN','NOT_EVALUATED','AVAILABLE',0,
         '0x1aaaaaaa00000000000000000000000000000001','${U.orgProducer}',
         '${snapNonCold.replace(/'/g, "''")}'::jsonb,'PENDING','seed-key-noncold-1')
      on conflict (id) do nothing;
    `);

    // ---- kode otorisasi contoh (SETELAH batch ada; hash Argon2id) ----
    const codes = [
      { batch: U.batchCold1, point: U.pointDcJakarta, raw: "KODE-DCJKT-DEMO-01" },
      { batch: U.batchCold2, point: U.pointDcJakarta, raw: "KODE-DCJKT-DEMO-02" },
      { batch: U.batchNonCold1, point: U.pointRetailSegar, raw: "KODE-SEGAR-DEMO-01" },
    ];
    const printed: { batch: string; point: string; code: string }[] = [];
    for (const c of codes) {
      const codeHash = await hash(c.raw, argon2Params);
      await db.exec(`
        insert into access_codes (batch_id, point_id, code_hash, valid_from, valid_until)
        values ('${c.batch}','${c.point}','${codeHash.replace(/'/g, "''")}',
                now() - interval '1 day', now() + interval '30 days')
        on conflict do nothing;
      `);
      printed.push({ batch: c.batch, point: c.point, code: c.raw });
    }

    await db.exec("commit");

    // Cetak kode otorisasi mentah HANYA ke seed-log lokal (pengujian manual;
    // tidak pernah masuk database / log aplikasi)
    const logPath = path.join(DB_DIR, "seed-codes.txt");
    await writeFile(
      logPath,
      printed.map((p) => `${p.batch} @ ${p.point} → ${p.code}`).join("\n") + "\n",
      "utf8",
    );
    console.log("Seed selesai.");
    console.log(`Kode otorisasi (lokal saja): ${logPath}`);
  } catch (e) {
    await db.exec("rollback");
    throw e;
  } finally {
    await db.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
