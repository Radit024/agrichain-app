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
  catColdYogurt: "44444444-4444-4444-4444-444444444443",
  catNonColdCoffee: "44444444-4444-4444-4444-444444444444",

  profileColdV1: "55555555-5555-5555-5555-555555555551",
  profileNonColdV1: "55555555-5555-5555-5555-555555555552",
  profileYogurtV1: "55555555-5555-5555-5555-555555555553",
  profileCoffeeV1: "55555555-5555-5555-5555-555555555554",

  userProducerAdmin: "66666666-6666-6666-6666-666666666661",
  userDistributorAdmin: "66666666-6666-6666-6666-666666666662",
  userRetailerAdmin: "66666666-6666-6666-6666-666666666663",
  userFactoryStaff: "66666666-6666-6666-6666-666666666664",

  pointDcJakarta: "77777777-7777-7777-7777-777777777771",
  pointRetailSegar: "77777777-7777-7777-7777-777777777772",
  pointDcSurabaya: "77777777-7777-7777-7777-777777777773",
  pointHubBandung: "77777777-7777-7777-7777-777777777774",
  pointRetailKelapaGading: "77777777-7777-7777-7777-777777777775",
  pointPabrikKarawang: "77777777-7777-7777-7777-777777777776",
  pointHubCiwidey: "77777777-7777-7777-7777-777777777777",

  catDistCold: "44444444-4444-4444-4444-444444444445",
  catDistNonCold: "44444444-4444-4444-4444-444444444446",
  catRetCold: "44444444-4444-4444-4444-444444444447",
  catRetNonCold: "44444444-4444-4444-4444-444444444448",

  profileDistColdV1: "55555555-5555-5555-5555-555555555555",
  profileDistNonColdV1: "55555555-5555-5555-5555-555555555556",
  profileRetColdV1: "55555555-5555-5555-5555-555555555557",
  profileRetNonColdV1: "55555555-5555-5555-5555-555555555558",

  batchCold1: "88888888-8888-8888-8888-888888888881",
  batchCold2: "88888888-8888-8888-8888-888888888882",
  batchNonCold1: "88888888-8888-8888-8888-888888888883",
  batchCold3: "88888888-8888-8888-8888-888888888884",
  batchCold4: "88888888-8888-8888-8888-888888888885",
  batchNonCold2: "88888888-8888-8888-8888-888888888886",
  batchCold5: "88888888-8888-8888-8888-888888888887",
  batchCold6: "88888888-8888-8888-8888-888888888888",
  batchDist1: "88888888-8888-8888-8888-888888888889",
  batchRet1: "88888888-8888-8888-8888-888888888890",
  batchDist2: "88888888-8888-8888-8888-888888888891",
  batchRet2: "88888888-8888-8888-8888-888888888892",
} as const;

async function main() {
  await mkdir(DB_DIR, { recursive: true });
  // Bersihkan folder DB lama agar PGlite selalu menginisialisasi cluster Postgres yang bersih dan bebas korupsi WAL
  const { rm } = await import("node:fs/promises");
  await rm(DB_PATH, { recursive: true, force: true });
  const db = new PGlite(DB_PATH);
  await db.waitReady;
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
        ('${U.orgProducer}','PT Agrichain Prima Agro','PRODUCER'),
        ('${U.orgDistributor}','PT Sentral Logistik Rantai Dingin','DISTRIBUTOR'),
        ('${U.orgRetailer}','Segar Mart Retail Indonesia','RETAILER')
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

    // ---- kategori produk ----
    await db.exec(`
      insert into product_categories (id, org_id, name, handling_mode) values
        ('${U.catCold}','${U.orgProducer}','Susu Segar Pasteurisasi','COLD_CHAIN'),
        ('${U.catColdYogurt}','${U.orgProducer}','Yogurt Probiotik Natural','COLD_CHAIN'),
        ('${U.catNonCold}','${U.orgProducer}','Keripik Buah Organik','NON_COLD_CHAIN'),
        ('${U.catNonColdCoffee}','${U.orgProducer}','Kopi Specialty Java Arabica','NON_COLD_CHAIN'),

        ('${U.catDistCold}','${U.orgDistributor}','Konsolidasi Dairy Rantai Dingin','COLD_CHAIN'),
        ('${U.catDistNonCold}','${U.orgDistributor}','Komoditas Logistik Suhu Ruang','NON_COLD_CHAIN'),

        ('${U.catRetCold}','${U.orgRetailer}','Produk Chiller Display Retail','COLD_CHAIN'),
        ('${U.catRetNonCold}','${U.orgRetailer}','Snack Kering & Minuman Kemasan','NON_COLD_CHAIN')
      on conflict (id) do nothing;
    `);

    // ---- profil berversi ----
    await db.exec(`
      insert into monitoring_profiles (id, category_id, version, is_locked, stale_after_seconds) values
        ('${U.profileColdV1}','${U.catCold}',1,false,900),
        ('${U.profileYogurtV1}','${U.catColdYogurt}',1,false,900),
        ('${U.profileNonColdV1}','${U.catNonCold}',1,false,1800),
        ('${U.profileCoffeeV1}','${U.catNonColdCoffee}',1,false,1800),

        ('${U.profileDistColdV1}','${U.catDistCold}',1,false,900),
        ('${U.profileDistNonColdV1}','${U.catDistNonCold}',1,false,1800),

        ('${U.profileRetColdV1}','${U.catRetCold}',1,false,900),
        ('${U.profileRetNonColdV1}','${U.catRetNonCold}',1,false,1800)
      on conflict (id) do nothing;
    `);

    await db.exec(`
      insert into profile_parameter_rules
        (profile_id, parameter_code, required, min_value_ppm, max_value_ppm, tolerance_seconds, severity) values
        ('${U.profileColdV1}','TEMPERATURE',true, 2000000, 6000000, 900,'CRITICAL'),
        ('${U.profileColdV1}','HUMIDITY',false,40000000,80000000, 900,'CRITICAL'),
        ('${U.profileColdV1}','DOOR_OPEN_DURATION',false,0,30000000,null,'WARNING'),
        ('${U.profileColdV1}','SHOCK_LEVEL',false,null,2000000,null,'WARNING'),

        ('${U.profileYogurtV1}','TEMPERATURE',true, 1000000, 4000000, 900,'CRITICAL'),
        ('${U.profileYogurtV1}','HUMIDITY',false,40000000,75000000, 900,'CRITICAL'),
        ('${U.profileYogurtV1}','DOOR_OPEN_DURATION',false,0,30000000,null,'WARNING'),

        ('${U.profileNonColdV1}','HUMIDITY',true, null,65000000, 1800,'CRITICAL'),
        ('${U.profileNonColdV1}','SHOCK_LEVEL',false,null,2000000,null,'CRITICAL'),
        ('${U.profileNonColdV1}','TEMPERATURE',false,null,null,null,'CONTEXT'),

        ('${U.profileCoffeeV1}','HUMIDITY',true, null,60000000, 1800,'CRITICAL'),
        ('${U.profileCoffeeV1}','SHOCK_LEVEL',false,null,2500000,null,'WARNING'),
        ('${U.profileCoffeeV1}','TEMPERATURE',false,null,null,null,'CONTEXT'),

        ('${U.profileDistColdV1}','TEMPERATURE',true, 2000000, 6000000, 900,'CRITICAL'),
        ('${U.profileDistColdV1}','HUMIDITY',false,40000000,80000000, 900,'CRITICAL'),
        ('${U.profileDistNonColdV1}','HUMIDITY',true, null,65000000, 1800,'CRITICAL'),

        ('${U.profileRetColdV1}','TEMPERATURE',true, 1000000, 5000000, 900,'CRITICAL'),
        ('${U.profileRetColdV1}','DOOR_OPEN_DURATION',false,0,30000000,null,'WARNING'),
        ('${U.profileRetNonColdV1}','HUMIDITY',true, null,65000000, 1800,'CRITICAL')
      on conflict (profile_id, parameter_code) do nothing;
    `);

    // ---- users (Privy DID dummy untuk showcase/screenshot; wallet embedded dummy) ----
    await db.exec(`
      insert into app_users (id, privy_did, display_name, email, wallet_address, status, mfa_verified) values
        ('${U.userProducerAdmin}','did:privy:seed:producer-admin','Budi Pratama (Admin Produsen)','demo.producer@agrichain.id','0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','ACTIVE',true),
        ('${U.userDistributorAdmin}','did:privy:seed:distributor-admin','Siti Rahma (Logistik Distributor)','demo.distributor@agrichain.id','0x98A1B93A7F19E378B45698Ac54cD389104b98722','ACTIVE',true),
        ('${U.userRetailerAdmin}','did:privy:seed:retailer-admin','Hendra Wijaya (Store Manager Retailer)','demo.retailer@agrichain.id','0x24C118e976B2d0614fA2D4734Ef6eCfe3A7e3f22','ACTIVE',true),
        ('${U.userFactoryStaff}','did:privy:seed:factory-staff','Ahmad Fauzi (Petugas Pabrik)','demo.staff@agrichain.id','0x1aaaaaaa00000000000000000000000000000004','ACTIVE',true)
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
      insert into distribution_points (id, org_id, public_name, internal_notes, is_active) values
        ('${U.pointPabrikKarawang}','${U.orgProducer}','Pabrik Sentral Karawang - Dok Dingin 1','Dok Muat & Cold Storage Utama Pabrik Karawang Km 54',true),
        ('${U.pointHubCiwidey}','${U.orgProducer}','Hub Pengumpulan Susu Lembang & Ciwidey','Pos Penerimaan Bahan Baku Segar Peternak Lokal Lembang',true),
        ('${U.pointDcJakarta}','${U.orgDistributor}','DC Jakarta Sentral','Gudang Utama Jl. Daan Mogot Km 14, Akses Dok Dingin 3 & 4',true),
        ('${U.pointDcSurabaya}','${U.orgDistributor}','DC Surabaya Rungkut','Kawasan Industri Rungkut Blok B-2, Hub Dingin Jawa Timur',true),
        ('${U.pointHubBandung}','${U.orgDistributor}','Hub Logistik Bandung','Jl. Soekarno Hatta No. 592, Transit Hub Priangan',true),
        ('${U.pointRetailSegar}','${U.orgRetailer}','Segar Mart Flagship Jakarta','Grand Indonesia LG Floor, Chiller Unit A1-A4',true),
        ('${U.pointRetailKelapaGading}','${U.orgRetailer}','Segar Mart Kelapa Gading','Mall Kelapa Gading 3 Ground, Cold Storage Room 2',true)
      on conflict (id) do nothing;
    `);
    await db.exec(`
      insert into distribution_point_schedules (point_id, weekday, start_time, end_time) values
        ('${U.pointPabrikKarawang}',1,'06:00','22:00'),
        ('${U.pointPabrikKarawang}',2,'06:00','22:00'),
        ('${U.pointPabrikKarawang}',3,'06:00','22:00'),
        ('${U.pointPabrikKarawang}',4,'06:00','22:00'),
        ('${U.pointPabrikKarawang}',5,'06:00','22:00'),
        ('${U.pointPabrikKarawang}',6,'06:00','20:00'),

        ('${U.pointHubCiwidey}',1,'05:00','19:00'),
        ('${U.pointHubCiwidey}',2,'05:00','19:00'),
        ('${U.pointHubCiwidey}',3,'05:00','19:00'),
        ('${U.pointHubCiwidey}',4,'05:00','19:00'),
        ('${U.pointHubCiwidey}',5,'05:00','19:00'),
        ('${U.pointHubCiwidey}',6,'05:00','19:00'),

        ('${U.pointDcJakarta}',1,'08:00','18:00'),
        ('${U.pointDcJakarta}',2,'08:00','18:00'),
        ('${U.pointDcJakarta}',3,'08:00','18:00'),
        ('${U.pointDcJakarta}',4,'08:00','18:00'),
        ('${U.pointDcJakarta}',5,'08:00','18:00'),

        ('${U.pointDcSurabaya}',1,'08:00','17:00'),
        ('${U.pointDcSurabaya}',2,'08:00','17:00'),
        ('${U.pointDcSurabaya}',3,'08:00','17:00'),

        ('${U.pointHubBandung}',1,'08:00','17:00'),
        ('${U.pointHubBandung}',2,'08:00','17:00'),

        ('${U.pointRetailSegar}',1,'09:00','22:00'),
        ('${U.pointRetailSegar}',2,'09:00','22:00'),
        ('${U.pointRetailSegar}',3,'09:00','22:00'),
        ('${U.pointRetailSegar}',4,'09:00','22:00'),
        ('${U.pointRetailSegar}',5,'09:00','22:00'),
        ('${U.pointRetailSegar}',6,'09:00','22:00'),
        ('${U.pointRetailSegar}',0,'09:00','22:00'),

        ('${U.pointRetailKelapaGading}',1,'09:00','21:30'),
        ('${U.pointRetailKelapaGading}',2,'09:00','21:30')
      on conflict (point_id, weekday, start_time) do nothing;
    `);
    await db.exec(`
      insert into point_assignments (user_id, point_id) values
        ('${U.userProducerAdmin}','${U.pointPabrikKarawang}'),
        ('${U.userProducerAdmin}','${U.pointHubCiwidey}'),
        ('${U.userFactoryStaff}','${U.pointPabrikKarawang}'),
        ('${U.userFactoryStaff}','${U.pointHubCiwidey}'),
        ('${U.userDistributorAdmin}','${U.pointDcJakarta}'),
        ('${U.userDistributorAdmin}','${U.pointDcSurabaya}'),
        ('${U.userDistributorAdmin}','${U.pointHubBandung}'),
        ('${U.userRetailerAdmin}','${U.pointRetailSegar}'),
        ('${U.userRetailerAdmin}','${U.pointRetailKelapaGading}')
      on conflict (user_id, point_id) do nothing;
    `);

    // ---- snapshots profil untuk batch ----
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
    const snapColdYogurt = JSON.stringify({
      handlingMode: "COLD_CHAIN",
      version: 1,
      staleAfterSeconds: 900,
      rules: [
        {
          code: "TEMPERATURE",
          unit: "°C",
          required: true,
          min: 1000000,
          max: 4000000,
          toleranceSeconds: 900,
          severity: "CRITICAL",
        },
        {
          code: "HUMIDITY",
          unit: "%RH",
          required: false,
          min: 40000000,
          max: 75000000,
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
          max: 65000000,
          toleranceSeconds: 1800,
          severity: "CRITICAL",
        },
        { code: "SHOCK_LEVEL", unit: "g", required: false, max: 2000000, severity: "CRITICAL" },
        { code: "TEMPERATURE", unit: "°C", required: false, severity: "CONTEXT" },
      ],
    });
    const snapNonColdCoffee = JSON.stringify({
      handlingMode: "NON_COLD_CHAIN",
      version: 1,
      staleAfterSeconds: 1800,
      rules: [
        {
          code: "HUMIDITY",
          unit: "%RH",
          required: true,
          max: 60000000,
          toleranceSeconds: 1800,
          severity: "CRITICAL",
        },
        { code: "SHOCK_LEVEL", unit: "g", required: false, max: 2500000, severity: "WARNING" },
        { code: "TEMPERATURE", unit: "°C", required: false, severity: "CONTEXT" },
      ],
    });

    // ---- 8 batch beragam status untuk showcase & screenshot ----
    await db.exec(`
      insert into batches
        (id, org_id, category_id, profile_id, batch_code, public_id, distribution_status,
         condition_status, data_quality_status, custody_stage, custodian_wallet, custodian_org_id,
         profile_snapshot, chain_sync_status, chain_batch_key, created_at, updated_at) values
        ('${U.batchCold1}','${U.orgProducer}','${U.catCold}','${U.profileColdV1}',
         'BATCH-2026-0001','AG23-7QXB-KF4M-9R2T','DALAM_DISTRIBUSI','COMPLIANT','AVAILABLE',1,
         '0x98A1B93A7F19E378B45698Ac54cD389104b98722','${U.orgDistributor}',
         '${snapCold.replace(/'/g, "''")}'::jsonb,'CONFIRMED','seed-key-cold-1',
         now() - interval '4 days', now() - interval '20 minutes'),

        ('${U.batchCold2}','${U.orgProducer}','${U.catCold}','${U.profileColdV1}',
         'BATCH-2026-0002','BM34-8RYC-LG5N-0S3U','DALAM_DISTRIBUSI','AT_RISK','AVAILABLE',1,
         '0x98A1B93A7F19E378B45698Ac54cD389104b98722','${U.orgDistributor}',
         '${snapCold.replace(/'/g, "''")}'::jsonb,'CONFIRMED','seed-key-cold-2',
         now() - interval '3 days', now() - interval '15 minutes'),

        ('${U.batchNonCold1}','${U.orgProducer}','${U.catNonColdCoffee}','${U.profileCoffeeV1}',
         'BATCH-2026-0003','CN45-9SZD-MH6P-1T4V','DALAM_DISTRIBUSI','COMPLIANT','AVAILABLE',1,
         '0x98A1B93A7F19E378B45698Ac54cD389104b98722','${U.orgDistributor}',
         '${snapNonColdCoffee.replace(/'/g, "''")}'::jsonb,'CONFIRMED','seed-key-noncold-1',
         now() - interval '5 days', now() - interval '1 hour'),

        ('${U.batchCold3}','${U.orgProducer}','${U.catCold}','${U.profileColdV1}',
         'BATCH-2026-0004','DP56-0TAE-NI7Q-2U5W','SELESAI','COMPLIANT','AVAILABLE',2,
         '0x24C118e976B2d0614fA2D4734Ef6eCfe3A7e3f22','${U.orgRetailer}',
         '${snapCold.replace(/'/g, "''")}'::jsonb,'CONFIRMED','seed-key-cold-3',
         now() - interval '8 days', now() - interval '6 hours'),

        ('${U.batchCold4}','${U.orgProducer}','${U.catColdYogurt}','${U.profileYogurtV1}',
         'BATCH-2026-0005','EQ67-1UBF-OJ8R-3V6X','DIDAFTARKAN','COMPLIANT','AVAILABLE',0,
         '0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','${U.orgProducer}',
         '${snapColdYogurt.replace(/'/g, "''")}'::jsonb,'CONFIRMED','seed-key-cold-4',
         now() - interval '2 hours', now() - interval '30 minutes'),

        ('${U.batchNonCold2}','${U.orgProducer}','${U.catNonCold}','${U.profileNonColdV1}',
         'BATCH-2026-0006','FR78-2VCG-PK9S-4W7Y','SELESAI','COMPLIANT','AVAILABLE',2,
         '0x24C118e976B2d0614fA2D4734Ef6eCfe3A7e3f22','${U.orgRetailer}',
         '${snapNonCold.replace(/'/g, "''")}'::jsonb,'CONFIRMED','seed-key-noncold-2',
         now() - interval '10 days', now() - interval '1 day'),

        ('${U.batchCold5}','${U.orgProducer}','${U.catCold}','${U.profileColdV1}',
         'BATCH-2026-0007','GS89-3WDH-QL0T-5X8Z','DALAM_DISTRIBUSI','AT_RISK','DATA_UNAVAILABLE',0,
         '0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','${U.orgProducer}',
         '${snapCold.replace(/'/g, "''")}'::jsonb,'CONFIRMED','seed-key-cold-5',
         now() - interval '2 days', now() - interval '45 minutes'),

        ('${U.batchCold6}','${U.orgProducer}','${U.catColdYogurt}','${U.profileYogurtV1}',
         'BATCH-2026-0008','HT90-4XEI-RM1U-6Y9A','DIDAFTARKAN','NOT_EVALUATED','AVAILABLE',0,
         '0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','${U.orgProducer}',
         '${snapColdYogurt.replace(/'/g, "''")}'::jsonb,'PENDING','seed-key-cold-6',
         now() - interval '1 hour', now() - interval '1 hour'),

        ('${U.batchDist1}','${U.orgDistributor}','${U.catDistCold}','${U.profileDistColdV1}',
         'BATCH-2026-D001','DK89-4FGT-PL5R-1M9K','DALAM_DISTRIBUSI','COMPLIANT','AVAILABLE',1,
         '0x98A1B93A7F19E378B45698Ac54cD389104b98722','${U.orgDistributor}',
         '${snapCold.replace(/'/g, "''")}'::jsonb,'CONFIRMED','seed-key-dist-1',
         now() - interval '2 days', now() - interval '10 minutes'),

        ('${U.batchDist2}','${U.orgDistributor}','${U.catDistNonCold}','${U.profileDistNonColdV1}',
         'BATCH-2026-D002','EL90-5GHU-QM6S-2N0L','SELESAI','COMPLIANT','AVAILABLE',2,
         '0x98A1B93A7F19E378B45698Ac54cD389104b98722','${U.orgDistributor}',
         '${snapNonCold.replace(/'/g, "''")}'::jsonb,'CONFIRMED','seed-key-dist-2',
         now() - interval '6 days', now() - interval '1 day'),

        ('${U.batchRet1}','${U.orgRetailer}','${U.catRetCold}','${U.profileRetColdV1}',
         'BATCH-2026-R001','FM01-6HIV-RN7T-3O1M','DALAM_DISTRIBUSI','COMPLIANT','AVAILABLE',2,
         '0x24C118e976B2d0614fA2D4734Ef6eCfe3A7e3f22','${U.orgRetailer}',
         '${snapCold.replace(/'/g, "''")}'::jsonb,'CONFIRMED','seed-key-ret-1',
         now() - interval '1 day', now() - interval '20 minutes'),

        ('${U.batchRet2}','${U.orgRetailer}','${U.catRetNonCold}','${U.profileRetNonColdV1}',
         'BATCH-2026-R002','GN12-7IJW-SO8U-4P2N','DALAM_DISTRIBUSI','COMPLIANT','AVAILABLE',2,
         '0x24C118e976B2d0614fA2D4734Ef6eCfe3A7e3f22','${U.orgRetailer}',
         '${snapNonCold.replace(/'/g, "''")}'::jsonb,'CONFIRMED','seed-key-ret-2',
         now() - interval '4 days', now() - interval '2 hours')
      on conflict (id) do nothing;
    `);

    // ---- serah-terima (intents & records) ----
    const intentIds = {
      b1_0to1: "99999999-9999-9999-9999-999999999901",
      b1_1to2: "99999999-9999-9999-9999-999999999902",
      b2_0to1: "99999999-9999-9999-9999-999999999903",
      b3_0to1: "99999999-9999-9999-9999-999999999904",
      b4_0to1: "99999999-9999-9999-9999-999999999905",
      b4_1to2: "99999999-9999-9999-9999-999999999906",
      b5_0to1: "99999999-9999-9999-9999-999999999907",
      b6_0to1: "99999999-9999-9999-9999-999999999908",
      b6_1to2: "99999999-9999-9999-9999-999999999909",
    };

    await db.exec(`
      insert into handoff_intents
        (id, batch_id, from_stage, to_stage, sender_user_id, sender_wallet, recipient_wallet,
         recipient_org_id, status, idempotency_key, chain_sync_status, initiated_at, expires_at, confirmed_at) values
        ('${intentIds.b1_0to1}','${U.batchCold1}',0,1,'${U.userProducerAdmin}',
         '0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','0x98A1B93A7F19E378B45698Ac54cD389104b98722',
         '${U.orgDistributor}','CONFIRMED','idemp-h1-0to1','CONFIRMED',
         now() - interval '3 days 4 hours', now() - interval '2 days', now() - interval '3 days 2 hours'),

        ('${intentIds.b1_1to2}','${U.batchCold1}',1,2,'${U.userDistributorAdmin}',
         '0x98A1B93A7F19E378B45698Ac54cD389104b98722','0x24C118e976B2d0614fA2D4734Ef6eCfe3A7e3f22',
         '${U.orgRetailer}','PENDING','idemp-h1-1to2','PENDING',
         now() - interval '1 hour', now() + interval '23 hours', null),

        ('${intentIds.b2_0to1}','${U.batchCold2}',0,1,'${U.userProducerAdmin}',
         '0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','0x98A1B93A7F19E378B45698Ac54cD389104b98722',
         '${U.orgDistributor}','CONFIRMED','idemp-h2-0to1','CONFIRMED',
         now() - interval '2 days 6 hours', now() - interval '1 day', now() - interval '2 days 4 hours'),

        ('${intentIds.b3_0to1}','${U.batchNonCold1}',0,1,'${U.userProducerAdmin}',
         '0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','0x98A1B93A7F19E378B45698Ac54cD389104b98722',
         '${U.orgDistributor}','CONFIRMED','idemp-h3-0to1','CONFIRMED',
         now() - interval '4 days', now() - interval '3 days', now() - interval '3 days 22 hours'),

        ('${intentIds.b4_0to1}','${U.batchCold3}',0,1,'${U.userProducerAdmin}',
         '0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','0x98A1B93A7F19E378B45698Ac54cD389104b98722',
         '${U.orgDistributor}','CONFIRMED','idemp-h4-0to1','CONFIRMED',
         now() - interval '7 days', now() - interval '6 days', now() - interval '6 days 20 hours'),
        ('${intentIds.b4_1to2}','${U.batchCold3}',1,2,'${U.userDistributorAdmin}',
         '0x98A1B93A7F19E378B45698Ac54cD389104b98722','0x24C118e976B2d0614fA2D4734Ef6eCfe3A7e3f22',
         '${U.orgRetailer}','CONFIRMED','idemp-h4-1to2','CONFIRMED',
         now() - interval '5 days', now() - interval '4 days', now() - interval '4 days 18 hours'),

        ('${intentIds.b5_0to1}','${U.batchCold4}',0,1,'${U.userProducerAdmin}',
         '0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','0x98A1B93A7F19E378B45698Ac54cD389104b98722',
         '${U.orgDistributor}','PENDING','idemp-h5-0to1','PENDING',
         now() - interval '30 minutes', now() + interval '23 hours', null),

        ('${intentIds.b6_0to1}','${U.batchNonCold2}',0,1,'${U.userProducerAdmin}',
         '0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','0x98A1B93A7F19E378B45698Ac54cD389104b98722',
         '${U.orgDistributor}','CONFIRMED','idemp-h6-0to1','CONFIRMED',
         now() - interval '9 days', now() - interval '8 days', now() - interval '8 days 20 hours'),
        ('${intentIds.b6_1to2}','${U.batchNonCold2}',1,2,'${U.userDistributorAdmin}',
         '0x98A1B93A7F19E378B45698Ac54cD389104b98722','0x24C118e976B2d0614fA2D4734Ef6eCfe3A7e3f22',
         '${U.orgRetailer}','CONFIRMED','idemp-h6-1to2','CONFIRMED',
         now() - interval '6 days', now() - interval '5 days', now() - interval '5 days 18 hours')
      on conflict (id) do nothing;
    `);

    await db.exec(`
      insert into handoff_records (batch_id, intent_id, from_stage, to_stage, sender_wallet, recipient_wallet, confirmed_at) values
        ('${U.batchCold1}','${intentIds.b1_0to1}',0,1,'0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','0x98A1B93A7F19E378B45698Ac54cD389104b98722', now() - interval '3 days 2 hours'),
        ('${U.batchCold2}','${intentIds.b2_0to1}',0,1,'0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','0x98A1B93A7F19E378B45698Ac54cD389104b98722', now() - interval '2 days 4 hours'),
        ('${U.batchNonCold1}','${intentIds.b3_0to1}',0,1,'0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','0x98A1B93A7F19E378B45698Ac54cD389104b98722', now() - interval '3 days 22 hours'),
        ('${U.batchCold3}','${intentIds.b4_0to1}',0,1,'0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','0x98A1B93A7F19E378B45698Ac54cD389104b98722', now() - interval '6 days 20 hours'),
        ('${U.batchCold3}','${intentIds.b4_1to2}',1,2,'0x98A1B93A7F19E378B45698Ac54cD389104b98722','0x24C118e976B2d0614fA2D4734Ef6eCfe3A7e3f22', now() - interval '4 days 18 hours'),
        ('${U.batchNonCold2}','${intentIds.b6_0to1}',0,1,'0x71C561E7F28f7dF7265B8808E5F091807d9B3C68','0x98A1B93A7F19E378B45698Ac54cD389104b98722', now() - interval '8 days 20 hours'),
        ('${U.batchNonCold2}','${intentIds.b6_1to2}',1,2,'0x98A1B93A7F19E378B45698Ac54cD389104b98722','0x24C118e976B2d0614fA2D4734Ef6eCfe3A7e3f22', now() - interval '5 days 18 hours')
      on conflict (id) do nothing;
    `);

    // ---- telemetri & pembacaan sensor IoT ----
    const readingIds = [
      "aaaa1111-1111-1111-1111-111111111101",
      "aaaa1111-1111-1111-1111-111111111102",
      "aaaa1111-1111-1111-1111-111111111103",
      "aaaa1111-1111-1111-1111-111111111104",
      "aaaa1111-1111-1111-1111-111111111105",
      "aaaa1111-1111-1111-1111-111111111106",
      "aaaa1111-1111-1111-1111-111111111107",
    ];

    await db.exec(`
      insert into condition_readings
        (id, batch_id, source, scenario, idempotency_key, checkpoint_id, door_state, cooling_state, device_health, read_at) values
        ('${readingIds[0]}','${U.batchCold1}','SIMULATOR','NORMAL','idemp-read-b1-1','${U.pointDcJakarta}','CLOSED','ON','ONLINE', now() - interval '20 minutes'),
        ('${readingIds[1]}','${U.batchCold1}','SIMULATOR','NORMAL','idemp-read-b1-2','${U.pointDcJakarta}','CLOSED','ON','ONLINE', now() - interval '2 hours'),
        ('${readingIds[2]}','${U.batchCold1}','SIMULATOR','NORMAL','idemp-read-b1-3','${U.pointDcJakarta}','CLOSED','ON','ONLINE', now() - interval '6 hours'),

        ('${readingIds[3]}','${U.batchCold2}','SIMULATOR','TEMP_EXCURSION','idemp-read-b2-1','${U.pointDcJakarta}','OPEN','FAULT','ONLINE', now() - interval '15 minutes'),
        ('${readingIds[4]}','${U.batchCold2}','SIMULATOR','DOOR_PROLONGED','idemp-read-b2-2','${U.pointDcJakarta}','OPEN','ON','ONLINE', now() - interval '1 hour'),

        ('${readingIds[5]}','${U.batchNonCold1}','SIMULATOR','NORMAL','idemp-read-b3-1','${U.pointDcJakarta}','CLOSED','OFF','ONLINE', now() - interval '1 hour'),

        ('${readingIds[6]}','${U.batchCold5}','SIMULATOR','SENSOR_DISCONNECTED','idemp-read-b7-1',null,'CLOSED','ON','OFFLINE', now() - interval '45 minutes')
      on conflict (id) do nothing;
    `);

    await db.exec(`
      insert into condition_measurements (reading_id, parameter_code, value_ppm) values
        ('${readingIds[0]}','TEMPERATURE', 3800000),
        ('${readingIds[0]}','HUMIDITY', 58000000),
        ('${readingIds[0]}','SHOCK_LEVEL', 150000),
        ('${readingIds[0]}','DOOR_OPEN_DURATION', 0),

        ('${readingIds[1]}','TEMPERATURE', 4100000),
        ('${readingIds[1]}','HUMIDITY', 56000000),
        ('${readingIds[2]}','TEMPERATURE', 3900000),
        ('${readingIds[2]}','HUMIDITY', 57000000),

        ('${readingIds[3]}','TEMPERATURE', 8400000),
        ('${readingIds[3]}','HUMIDITY', 65000000),
        ('${readingIds[3]}','SHOCK_LEVEL', 400000),
        ('${readingIds[3]}','DOOR_OPEN_DURATION', 45000000),

        ('${readingIds[4]}','TEMPERATURE', 7200000),
        ('${readingIds[4]}','DOOR_OPEN_DURATION', 35000000),

        ('${readingIds[5]}','HUMIDITY', 52000000),
        ('${readingIds[5]}','SHOCK_LEVEL', 200000),
        ('${readingIds[5]}','TEMPERATURE', 24500000)
      on conflict (reading_id, parameter_code) do nothing;
    `);

    // ---- evaluasi kondisi & peringatan (widget dasbor) ----
    await db.exec(`
      insert into condition_evaluations
        (batch_id, reading_id, condition_status, data_quality_status, reasons, operational_alerts, created_at) values
        ('${U.batchCold1}','${readingIds[0]}','COMPLIANT','AVAILABLE',
         '["Suhu 3.8°C dalam batas aman (2.0°C - 6.0°C)","Kelembaban 58% stabil"]'::jsonb,'[]'::jsonb, now() - interval '20 minutes'),

        ('${U.batchCold2}','${readingIds[3]}','AT_RISK','AVAILABLE',
         '["AT_RISK: Suhu terdeteksi 8.4°C melebihi ambang batas kritis (6.0°C) selama 1200 detik"]'::jsonb,
         '["EXCURSION_TEMPERATURE"]'::jsonb, now() - interval '15 minutes'),
        ('${U.batchCold2}','${readingIds[4]}','AT_RISK','AVAILABLE',
         '["AT_RISK: Pintu kompartemen pendingin terbuka selama 45 detik (melebihi batas peringatan 30 detik)"]'::jsonb,
         '["DOOR_OPEN_WARNING"]'::jsonb, now() - interval '1 hour'),

        ('${U.batchCold5}','${readingIds[6]}','AT_RISK','DATA_UNAVAILABLE',
         '["DATA_UNAVAILABLE: Telemetri IoT offline lebih dari 1800 detik"]'::jsonb,
         '["DEVICE_OFFLINE"]'::jsonb, now() - interval '45 minutes')
      on conflict (id) do nothing;
    `);

    // Evaluasi historis 14 hari agar grafik tren (ConditionBarChart) penuh dan hidup
    for (let day = 13; day >= 0; day--) {
      const compliantCount = 3 + (day % 3);
      for (let i = 0; i < compliantCount; i++) {
        await db.exec(`
          insert into condition_evaluations
            (batch_id, condition_status, data_quality_status, reasons, operational_alerts, created_at) values
            ('${U.batchCold1}', 'COMPLIANT', 'AVAILABLE', '["Parameter terpantau sesuai baku mutu"]'::jsonb, '[]'::jsonb,
             current_date - interval '${day} days' + interval '${8 + i * 2} hours');
        `);
      }

      if (day === 0 || day === 1 || day === 4 || day === 8) {
        await db.exec(`
          insert into condition_evaluations
            (batch_id, condition_status, data_quality_status, reasons, operational_alerts, created_at) values
            ('${U.batchCold2}', 'AT_RISK', 'AVAILABLE', '["Fluktuasi suhu terdeteksi pada dok muat"]'::jsonb, '["TEMP_SPIKE"]'::jsonb,
             current_date - interval '${day} days' + interval '14 hours');
        `);
      }
    }

    // ---- log verifikasi akses petugas (7 hari) ----
    for (let d = 6; d >= 0; d--) {
      for (let s = 1; s <= 5; s++) {
        await db.exec(`
          insert into access_attempts
            (batch_id, public_id_used, point_id, actor_user_id, result, detail_offchain, attempted_at) values
            ('${U.batchCold1}', 'AG23-7QXB-KF4M-9R2T', '${U.pointDcJakarta}', '${U.userDistributorAdmin}',
             'SAH', 'Verifikasi kode otorisasi berhasil pada gerbang dok transit',
             now() - interval '${d} days' - interval '${s * 2} hours');
        `);
      }
    }
    await db.exec(`
      insert into access_attempts
        (batch_id, public_id_used, point_id, actor_user_id, result, detail_offchain, attempted_at) values
        ('${U.batchCold3}', 'DP56-0TAE-NI7Q-2U5W', '${U.pointRetailSegar}', '${U.userRetailerAdmin}',
         'SAH', 'Verifikasi kode penerimaan toko retail Segar Mart Flagship berhasil', now() - interval '1 day'),
        ('${U.batchCold3}', 'DP56-0TAE-NI7Q-2U5W', '${U.pointRetailSegar}', '${U.userRetailerAdmin}',
         'SAH', 'Pemeriksaan kelayakan barcode konsumen berhasil', now() - interval '12 hours'),
        ('${U.batchNonCold1}', 'CN45-9SZD-MH6P-1T4V', '${U.pointDcSurabaya}', '${U.userDistributorAdmin}',
         'SAH', 'Akses masuk kontainer kopi di DC Surabaya Rungkut terverifikasi', now() - interval '2 days'),
        ('${U.batchCold1}', 'AG23-7QXB-KF4M-9R2T', '${U.pointDcJakarta}', '${U.userDistributorAdmin}',
         'TIDAK_SAH', 'Kode otorisasi salah atau token telah kedaluwarsa', now() - interval '3 days 5 hours'),
        ('${U.batchCold2}', 'BM34-8RYC-LG5N-0S3U', '${U.pointHubBandung}', '${U.userDistributorAdmin}',
         'TIDAK_SAH', 'Kode verifikasi tidak cocok dengan batch tujuan fasilitas', now() - interval '2 days 3 hours'),
        ('${U.batchCold5}', 'GS89-3WDH-QL0T-5X8Z', '${U.pointDcSurabaya}', '${U.userDistributorAdmin}',
         'TIDAK_SAH', 'Hash kode otorisasi tidak ditemukan pada pangkalan data', now() - interval '1 day 8 hours'),
        ('${U.batchCold2}', 'BM34-8RYC-LG5N-0S3U', '${U.pointDcJakarta}', '${U.userDistributorAdmin}',
         'ANOMALI', 'Upaya verifikasi tercatat di luar jadwal jam operasional fasilitas (pukul 23:48 WIB)', now() - interval '2 days 1 hour'),

        ('${U.batchCold4}', 'EQ67-1UBF-OJ8R-3V6X', '${U.pointPabrikKarawang}', '${U.userProducerAdmin}',
         'SAH', 'Pemeriksaan otorisasi gerbang keluar pabrik Karawang berhasil', now() - interval '1 hour 30 minutes'),
        ('${U.batchCold4}', 'EQ67-1UBF-OJ8R-3V6X', '${U.pointPabrikKarawang}', '${U.userFactoryStaff}',
         'SAH', 'Inspeksi fisik batch produksi Karawang terverifikasi', now() - interval '45 minutes'),
        ('${U.batchCold5}', 'GS89-3WDH-QL0T-5X8Z', '${U.pointHubCiwidey}', '${U.userProducerAdmin}',
         'SAH', 'Verifikasi penerimaan susu peternak Ciwidey berhasil', now() - interval '1 day 2 hours'),
        ('${U.batchCold6}', 'HT90-4XEI-RM1U-6Y9A', '${U.pointPabrikKarawang}', '${U.userFactoryStaff}',
         'TIDAK_SAH', 'Kode batch belum terdaftar pada jadwal muat hari ini', now() - interval '2 hours'),
        ('${U.batchCold5}', 'GS89-3WDH-QL0T-5X8Z', '${U.pointHubCiwidey}', '${U.userProducerAdmin}',
         'ANOMALI', 'Verifikasi di luar jam penerimaan tangki bahan baku', now() - interval '3 days 4 hours'),

        ('${U.batchRet1}', 'FM01-6HIV-RN7T-3O1M', '${U.pointRetailSegar}', '${U.userRetailerAdmin}',
         'SAH', 'Penerimaan stok rak display chiller Segar Mart Flagship terverifikasi', now() - interval '3 hours'),
        ('${U.batchRet2}', 'GN12-7IJW-SO8U-4P2N', '${U.pointRetailKelapaGading}', '${U.userRetailerAdmin}',
         'SAH', 'Pemeriksaan stok barang non-cold chain toko Kelapa Gading berhasil', now() - interval '5 hours');
    `);

    // ---- jejak audit blockchain polygon amoy ----
    await db.exec(`
      insert into transaction_references
        (batch_id, intent_id, event_type, idempotency_key, chain_tx_hash, chain_block, chain_sync_status, submitted_by, receipt_confirmed_at, created_at) values
        ('${U.batchCold1}', null, 'BATCH_REGISTERED', 'tx-ref-reg-b1',
         '0x7fa2198b1e4c93005d677a29e4bf321890cdba3129845ef92a149bce37418902', 15820120, 'CONFIRMED',
         '${U.userProducerAdmin}', now() - interval '4 days', now() - interval '4 days'),

        ('${U.batchCold1}', '${intentIds.b1_0to1}', 'HANDOFF_INITIATED', 'tx-ref-h-init-b1',
         '0x83b9c02d1f4a56910023ee45a892b1093847fedbca092183492810f924719203', 15821040, 'CONFIRMED',
         '${U.userProducerAdmin}', now() - interval '3 days 4 hours', now() - interval '3 days 4 hours'),

        ('${U.batchCold1}', '${intentIds.b1_0to1}', 'HANDOFF_CONFIRMED', 'tx-ref-h-conf-b1',
         '0x918340dfba982301948520394812fbec8372648102938471092384712', 15821095, 'CONFIRMED',
         '${U.userDistributorAdmin}', now() - interval '3 days 2 hours', now() - interval '3 days 2 hours'),

        ('${U.batchCold2}', null, 'BATCH_REGISTERED', 'tx-ref-reg-b2',
         '0x6192847109283740192837401928374019283740192837401928374019283740', 15822300, 'CONFIRMED',
         '${U.userProducerAdmin}', now() - interval '3 days', now() - interval '3 days'),

        ('${U.batchCold2}', null, 'CONDITION', 'tx-ref-cond-b2',
         '0x5291837401928374019283740192837401928374019283740192837401928374', 15822450, 'CONFIRMED',
         '${U.userDistributorAdmin}', now() - interval '15 minutes', now() - interval '15 minutes'),

        ('${U.batchCold3}', null, 'BATCH_REGISTERED', 'tx-ref-reg-b4',
         '0x4391827401928374019283740192837401928374019283740192837401928374', 15823100, 'CONFIRMED',
         '${U.userProducerAdmin}', now() - interval '8 days', now() - interval '8 days'),

        ('${U.batchCold3}', '${intentIds.b4_1to2}', 'HANDOFF_CONFIRMED', 'tx-ref-h-conf-b4',
         '0x3491827401928374019283740192837401928374019283740192837401928374', 15824500, 'CONFIRMED',
         '${U.userRetailerAdmin}', now() - interval '4 days 18 hours', now() - interval '4 days 18 hours'),

        (null, null, 'DIGEST', 'tx-ref-digest-anchor',
         '0x2591827401928374019283740192837401928374019283740192837401928374', 15826000, 'CONFIRMED',
         '${U.userProducerAdmin}', now() - interval '1 day', now() - interval '1 day'),

        ('${U.batchCold4}', null, 'BATCH_REGISTERED', 'tx-ref-reg-b5',
         '0x0791827401928374019283740192837401928374019283740192837401928374', 15829100, 'CONFIRMED',
         '${U.userProducerAdmin}', now() - interval '2 hours', now() - interval '2 hours'),

        ('${U.batchDist1}', null, 'BATCH_REGISTERED', 'tx-ref-reg-dist1',
         '0x1291827401928374019283740192837401928374019283740192837401928374', 15830110, 'CONFIRMED',
         '${U.userDistributorAdmin}', now() - interval '2 days', now() - interval '2 days'),

        ('${U.batchRet1}', null, 'BATCH_REGISTERED', 'tx-ref-reg-ret1',
         '0x9991827401928374019283740192837401928374019283740192837401928374', 15831200, 'CONFIRMED',
         '${U.userRetailerAdmin}', now() - interval '1 day', now() - interval '1 day')
      on conflict (id) do nothing;
    `);

    // ---- kode otorisasi (hash Argon2id) ----
    const codes = [
      { batch: U.batchCold1, point: U.pointDcJakarta, raw: "KODE-DCJKT-DEMO-01" },
      { batch: U.batchCold2, point: U.pointDcJakarta, raw: "KODE-DCJKT-DEMO-02" },
      { batch: U.batchNonCold1, point: U.pointDcSurabaya, raw: "KODE-SBY-DEMO-01" },
      { batch: U.batchCold3, point: U.pointRetailSegar, raw: "KODE-SEGAR-DEMO-01" },
      { batch: U.batchCold4, point: U.pointRetailKelapaGading, raw: "KODE-SEGAR-DEMO-02" },
      { batch: U.batchCold4, point: U.pointPabrikKarawang, raw: "KODE-PABRIK-DEMO-01" },
      { batch: U.batchCold5, point: U.pointHubCiwidey, raw: "KODE-CIWIDEY-DEMO-01" },
      { batch: U.batchDist1, point: U.pointHubBandung, raw: "KODE-BDG-DEMO-01" },
      { batch: U.batchRet1, point: U.pointRetailSegar, raw: "KODE-SEGAR-DEMO-03" },
    ];
    const printed: { batch: string; point: string; code: string }[] = [];
    for (const c of codes) {
      const codeHash = await hash(c.raw, argon2Params);
      await db.exec(`
        insert into access_codes (batch_id, point_id, code_hash, valid_from, valid_until)
        values ('${c.batch}','${c.point}','${codeHash.replace(/'/g, "''")}',
                now() - interval '2 days', now() + interval '30 days')
        on conflict do nothing;
      `);
      printed.push({ batch: c.batch, point: c.point, code: c.raw });
    }

    await db.exec("commit");

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
