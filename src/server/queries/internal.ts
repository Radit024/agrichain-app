import "server-only";
import type { DbAdapter } from "../actions/invitations";
import type { Session } from "../auth/session";

/**
 * Query layer untuk layar internal (Fase I). Semua query membaca melalui
 * backend setelah sesi diverifikasi; organisasi disaring berdasarkan
 * membership sesi (IDOR guard di sini, bukan hanya di UI).
 */

export interface DashboardMetrics {
  activeBatches: number;
  awaitingReception: number;
  compliant: number;
  atRisk: number;
  inDistribution: number;
  registeredToday: number;
  activePointsCount: number;
  totalPointsCount: number;
  sahAttempts: number;
  tidakSahAttempts: number;
  anomaliAttempts: number;
  pendingIncomingHandoffsCount?: number;
  pendingIncomingItems?: Array<{
    batchId: string;
    batchCode: string;
    senderOrg: string;
    fromStage: number;
    initiatedAt: string;
  }>;
  attentionBatches: AttentionBatch[];
  conditionAlerts: ConditionAlert[];
  conditionTrend: Array<{ day: string; compliant: number; atRisk: number }>;
  handoffTrend: Array<{ day: string; dicatat: number; dikonfirmasi: number }>;
}

export interface AttentionBatch {
  id: string;
  batchCode: string;
  productName: string;
  distributionStatus: string;
  conditionStatus: string;
  dataQualityStatus: string;
  updatedAt: string;
}

export interface ConditionAlert {
  id: string;
  batchCode: string;
  reason: string;
  createdAt: string;
}

export async function getDashboardMetrics(
  db: DbAdapter,
  session: Session,
): Promise<DashboardMetrics> {
  const orgIds = session.memberships.map((m) => m.orgId);
  if (orgIds.length === 0) {
    return {
      activeBatches: 0,
      awaitingReception: 0,
      compliant: 0,
      atRisk: 0,
      inDistribution: 0,
      registeredToday: 0,
      activePointsCount: 0,
      totalPointsCount: 0,
      sahAttempts: 0,
      tidakSahAttempts: 0,
      anomaliAttempts: 0,
      attentionBatches: [],
      conditionAlerts: [],
      conditionTrend: [],
      handoffTrend: [],
    };
  }
  const params = orgIds.map((_, i) => `$${i + 1}`).join(",");
  // "orgIds" tuple — dipakai query di bawah
  void params;

  const counts = await db.query<{
    active_batches: number;
    in_distribution: number;
    compliant: number;
    at_risk: number;
    awaiting_reception: number;
    registered_today: number;
  }>(
    `select
       count(*) filter (where distribution_status <> 'SELESAI')::int as active_batches,
       count(*) filter (where distribution_status = 'DALAM_DISTRIBUSI')::int as in_distribution,
       count(*) filter (where condition_status = 'COMPLIANT')::int as compliant,
       count(*) filter (where condition_status = 'AT_RISK')::int as at_risk,
       count(*) filter (where pending_intent is not null)::int as awaiting_reception,
       count(*) filter (where created_at >= date_trunc('day', now()))::int as registered_today
     from (
       select b.*,
         (select i.id from handoff_intents i where i.batch_id = b.id and i.status = 'PENDING' limit 1) as pending_intent
       from batches b where (b.org_id = any($1::uuid[]) or b.custodian_org_id = any($1::uuid[]))
     ) t`,
    [orgIds],
  );
  const c = counts[0];

  const attempts = await db.query<{
    sah: number;
    tidak_sah: number;
    anomali: number;
  }>(
    `select
       count(*) filter (where result = 'SAH')::int as sah,
       count(*) filter (where result = 'TIDAK_SAH')::int as tidak_sah,
       count(*) filter (where result = 'ANOMALI')::int as anomali
     from access_attempts a
     join batches b on b.id = a.batch_id
     where (b.org_id = any($1::uuid[]) or b.custodian_org_id = any($1::uuid[])) and a.attempted_at >= now() - interval '7 days'`,
    [orgIds],
  );
  const at = attempts[0];

  const attention = await db.query<{
    id: string;
    batch_code: string;
    distribution_status: string;
    condition_status: string;
    data_quality_status: string;
    updated_at: string;
    product_name: string;
  }>(
    `select b.id, b.batch_code, b.distribution_status, b.condition_status,
            b.data_quality_status, b.updated_at,
            coalesce(c.name, '') as product_name
     from batches b
     left join product_categories c on c.id = b.category_id
     where (b.org_id = any($1::uuid[]) or b.custodian_org_id = any($1::uuid[]))
       and (b.condition_status = 'AT_RISK'
            or b.data_quality_status = 'DATA_UNAVAILABLE'
            or exists (select 1 from handoff_intents i where i.batch_id = b.id and i.status = 'PENDING'))
     order by b.updated_at desc
     limit 8`,
    [orgIds],
  );

  const alerts = await db.query<{
    id: string;
    batch_code: string;
    reason: string;
    created_at: string;
  }>(
    `select e.id, b.batch_code, e.reasons::text as reason, e.created_at
     from condition_evaluations e
     join batches b on b.id = e.batch_id
     where (b.org_id = any($1::uuid[]) or b.custodian_org_id = any($1::uuid[]))
       and (e.reasons::text like '%AT_RISK%' or e.reasons::text like '%DATA_UNAVAILABLE%')
     order by e.created_at desc
     limit 6`,
    [orgIds],
  );

  const trend = await db.query<{
    day: string;
    compliant: number;
    at_risk: number;
  }>(
    `select to_char(d.day, 'YYYY-MM-DD') as day,
       count(e.id) filter (where e.condition_status = 'COMPLIANT')::int as compliant,
       count(e.id) filter (where e.condition_status = 'AT_RISK')::int as at_risk
     from generate_series(current_date - interval '13 days', current_date, interval '1 day') as d(day)
     left join condition_evaluations e
       on date_trunc('day', e.created_at) = d.day
       and e.batch_id in (select id from batches where org_id = any($1::uuid[]) or custodian_org_id = any($1::uuid[]))
     group by d.day order by d.day`,
    [orgIds],
  );

  const handoffTrend = await db.query<{
    day: string;
    initiated: number;
    confirmed: number;
  }>(
    `select to_char(d.day, 'YYYY-MM-DD') as day,
       count(i.id) filter (where i.status = 'PENDING')::int as initiated,
       count(i.id) filter (where i.status = 'CONFIRMED')::int as confirmed
     from generate_series(current_date - interval '13 days', current_date, interval '1 day') as d(day)
     left join handoff_intents i
       on date_trunc('day', i.initiated_at) = d.day
       and i.batch_id in (select id from batches where org_id = any($1::uuid[]) or custodian_org_id = any($1::uuid[]))
     group by d.day order by d.day`,
    [orgIds],
  );

  const pointCounts = await db.query<{
    total: number;
    active: number;
  }>(
    `select
       count(*)::int as total,
       count(*) filter (where is_active = true)::int as active
     from distribution_points
     where org_id = any($1::uuid[])`,
    [orgIds],
  );
  const pc = pointCounts[0] ?? { total: 0, active: 0 };

  const incoming = await db.query<{
    batch_id: string;
    batch_code: string;
    sender_org: string;
    from_stage: number;
    initiated_at: string;
  }>(
    `select b.id as batch_id, b.batch_code, so.name as sender_org, i.from_stage, i.initiated_at
     from handoff_intents i
     join batches b on b.id = i.batch_id
     join orgs so on so.id = b.org_id
     where i.recipient_org_id = any($1::uuid[]) and i.status = 'PENDING' and i.expires_at > now()
     order by i.initiated_at desc limit 3`,
    [orgIds],
  );
  const incomingCount = await db.query<{ n: number }>(
    `select count(*)::int as n from handoff_intents
     where recipient_org_id = any($1::uuid[]) and status = 'PENDING' and expires_at > now()`,
    [orgIds],
  );

  return {
    activeBatches: c.active_batches,
    awaitingReception: c.awaiting_reception,
    compliant: c.compliant,
    atRisk: c.at_risk,
    inDistribution: c.in_distribution,
    registeredToday: c.registered_today,
    activePointsCount: pc.active,
    totalPointsCount: pc.total,
    sahAttempts: at.sah,
    tidakSahAttempts: at.tidak_sah,
    anomaliAttempts: at.anomali,
    pendingIncomingHandoffsCount: incomingCount[0]?.n || 0,
    pendingIncomingItems: incoming.map((r) => ({
      batchId: r.batch_id,
      batchCode: r.batch_code,
      senderOrg: r.sender_org,
      fromStage: r.from_stage,
      initiatedAt: r.initiated_at,
    })),
    attentionBatches: attention.map((r) => ({
      id: r.id,
      batchCode: r.batch_code,
      productName: r.product_name,
      distributionStatus: r.distribution_status,
      conditionStatus: r.condition_status,
      dataQualityStatus: r.data_quality_status,
      updatedAt: r.updated_at,
    })),
    conditionAlerts: alerts.map((r) => ({
      id: r.id,
      batchCode: r.batch_code,
      reason: r.reason,
      createdAt: r.created_at,
    })),
    conditionTrend: trend.map((t) => ({
      day: t.day,
      compliant: t.compliant,
      atRisk: t.at_risk,
    })),
    handoffTrend: handoffTrend.map((t) => ({
      day: t.day,
      dicatat: t.initiated,
      dikonfirmasi: t.confirmed,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Batch list + filter                                                 */
/* ------------------------------------------------------------------ */

export interface BatchListItem {
  id: string;
  batchCode: string;
  publicId: string;
  categoryName: string;
  handlingMode: "COLD_CHAIN" | "NON_COLD_CHAIN";
  distributionStatus: string;
  conditionStatus: string;
  dataQualityStatus: string;
  custodyStage: number;
  lastUpdate: string;
  lastPointName: string | null;
}

export interface BatchListFilters {
  mode?: "COLD_CHAIN" | "NON_COLD_CHAIN";
  distribution?: string;
  condition?: string;
  dataQuality?: string;
  q?: string;
}

export async function listBatches(
  db: DbAdapter,
  session: Session,
  filters: BatchListFilters = {},
): Promise<BatchListItem[]> {
  const orgIds = session.memberships.map((m) => m.orgId);
  if (orgIds.length === 0) return [];

  const rows = await db.query<{
    id: string;
    batch_code: string;
    public_id: string;
    category_name: string;
    handling_mode: string;
    distribution_status: string;
    condition_status: string;
    data_quality_status: string;
    custody_stage: number;
    updated_at: string;
    last_point: string | null;
  }>(
    `select b.id, b.batch_code, b.public_id, c.name as category_name, c.handling_mode,
            b.distribution_status, b.condition_status, b.data_quality_status,
            b.custody_stage, b.updated_at,
            (select p.public_name from handoff_records r
               join distribution_points p on p.id = (
                 select point_id from access_codes ac where ac.batch_id = b.id
                 order by ac.valid_until desc limit 1)
               where r.batch_id = b.id order by r.confirmed_at desc limit 1) as last_point
     from batches b join product_categories c on c.id = b.category_id
     where (b.org_id = any($1::uuid[]) or b.custodian_org_id = any($1::uuid[]))
       and ($2::handling_mode is null or c.handling_mode = $2::handling_mode)
       and ($3::text is null or b.distribution_status = $3::text)
       and ($4::text is null or b.condition_status = $4::text)
       and ($5::text is null or b.data_quality_status = $5::text)
       and ($6::text is null or b.batch_code ilike '%' || $6::text || '%'
            or b.public_id ilike '%' || $6::text || '%'
            or c.name ilike '%' || $6::text || '%')
     order by
       case when b.condition_status = 'AT_RISK' then 0
            when b.data_quality_status = 'DATA_UNAVAILABLE' then 1
            else 2 end,
       b.updated_at desc
     limit 100`,
    [
      orgIds,
      filters.mode ?? null,
      filters.distribution ?? null,
      filters.condition ?? null,
      filters.dataQuality ?? null,
      filters.q ?? null,
    ],
  );

  return rows.map((r) => ({
    id: r.id,
    batchCode: r.batch_code,
    publicId: r.public_id,
    categoryName: r.category_name,
    handlingMode: r.handling_mode as "COLD_CHAIN" | "NON_COLD_CHAIN",
    distributionStatus: r.distribution_status,
    conditionStatus: r.condition_status,
    dataQualityStatus: r.data_quality_status,
    custodyStage: r.custody_stage,
    lastUpdate: r.updated_at,
    lastPointName: r.last_point,
  }));
}

/* ------------------------------------------------------------------ */
/* Batch detail                                                        */
/* ------------------------------------------------------------------ */

export interface BatchDetail {
  id: string;
  batchCode: string;
  publicId: string;
  orgId: string;
  categoryName: string;
  handlingMode: "COLD_CHAIN" | "NON_COLD_CHAIN";
  distributionStatus: string;
  conditionStatus: string;
  dataQualityStatus: string;
  custodyStage: number;
  paused: boolean;
  createdAt: string;
  updatedAt: string;
  profileSnapshot: {
    handlingMode: string;
    version: number;
    staleAfterSeconds: number;
    rules: Array<{
      code: string;
      unit: string;
      required: boolean;
      minPPM: number | null;
      maxPPM: number | null;
      toleranceSeconds: number | null;
      severity: string;
    }>;
  };
  latestEvaluation: {
    conditionStatus: string;
    dataQualityStatus: string;
    reasons: string[];
    alerts: string[];
    evaluatedAt: string;
  } | null;
  latestReading: {
    readAt: string;
    deviceHealth: string;
    values: Array<{ code: string; unit: string; valuePPM: string | null }>;
  } | null;
  evaluationHistory: Array<{
    id: string;
    conditionStatus: string;
    dataQualityStatus: string;
    reasons: string[];
    alerts: string[];
    evaluatedAt: string;
  }>;
  recentReadings: Array<{
    id: string;
    readAt: string;
    deviceHealth: string;
    scenario: string | null;
    values: Array<{ code: string; unit: string; valuePPM: string | null }>;
  }>;
  handoffs: Array<{
    fromStage: number;
    toStage: number;
    confirmedAt: string;
    pointName: string | null;
  }>;
  pendingIntent: {
    id: string;
    toStage: number;
    expiresAt: string;
    status: string;
  } | null;
  chainSyncStatus: string;
  chainTxHash: string | null;
}

export async function getBatchDetail(
  db: DbAdapter,
  session: Session,
  batchId: string,
): Promise<BatchDetail | null> {
  const rows = await db.query<{
    id: string;
    batch_code: string;
    public_id: string;
    org_id: string;
    custodian_org_id: string | null;
    category_name: string;
    handling_mode: string;
    distribution_status: string;
    condition_status: string;
    data_quality_status: string;
    custody_stage: number;
    paused: boolean;
    created_at: string;
    updated_at: string;
    profile_snapshot: BatchDetail["profileSnapshot"];
    chain_sync_status: string;
  }>(
    `select b.id, b.batch_code, b.public_id, b.org_id, b.custodian_org_id, c.name as category_name,
            c.handling_mode, b.distribution_status, b.condition_status,
            b.data_quality_status, b.custody_stage, b.paused, b.created_at,
            b.updated_at, b.profile_snapshot, b.chain_sync_status
     from batches b join product_categories c on c.id = b.category_id
     where b.id = $1`,
    [batchId],
  );
  const b = rows[0];
  if (!b) return null;
  // IDOR guard: batch harus milik org pencipta atau org kustodian saat ini
  if (
    !session.memberships.some(
      (m) => m.orgId === b.org_id || (b.custodian_org_id && m.orgId === b.custodian_org_id),
    )
  )
    return null;

  const evalRows = await db.query<{
    id: string;
    condition_status: string;
    data_quality_status: string;
    reasons: string[];
    operational_alerts: string[];
    created_at: string;
  }>(
    `select id, condition_status, data_quality_status, reasons, operational_alerts, created_at
     from condition_evaluations where batch_id = $1 order by created_at desc limit 10`,
    [batchId],
  );

  const readingRows = await db.query<{
    id: string;
    read_at: string;
    device_health: string;
    scenario: string | null;
  }>(
    `select id, read_at, device_health, scenario from condition_readings
     where batch_id = $1 order by read_at desc limit 15`,
    [batchId],
  );
  const readingIds = readingRows.map((r) => r.id);
  const measurements =
    readingIds.length > 0
      ? await db.query<{
          reading_id: string;
          parameter_code: string;
          unit: string;
          value_ppm: string | null;
        }>(
          `select m.reading_id, m.parameter_code, d.unit, m.value_ppm
           from condition_measurements m
           join monitoring_parameter_definitions d on d.code = m.parameter_code
           where m.reading_id = any($1::uuid[])`,
          [readingIds],
        )
      : [];

  const reading = readingRows[0] ?? null;
  const latestMeasurements = reading ? measurements.filter((m) => m.reading_id === reading.id) : [];

  const handoffs = await db.query<{
    from_stage: number;
    to_stage: number;
    confirmed_at: string;
    point_name: string | null;
  }>(
    `select r.from_stage, r.to_stage, r.confirmed_at, p.public_name as point_name
     from handoff_records r
     left join distribution_points p on p.id = (
       select point_id from access_codes ac where ac.batch_id = r.batch_id
       order by ac.valid_until desc limit 1)
     where r.batch_id = $1 order by r.confirmed_at asc`,
    [batchId],
  );

  const intents = await db.query<{
    id: string;
    to_stage: number;
    expires_at: string;
    status: string;
  }>(
    `select id, to_stage, expires_at, status from handoff_intents
     where batch_id = $1 and status = 'PENDING' limit 1`,
    [batchId],
  );

  const tx = await db.query<{ chain_tx_hash: string | null }>(
    `select chain_tx_hash from transaction_references
     where batch_id = $1 order by created_at desc limit 1`,
    [batchId],
  );

  return {
    id: b.id,
    batchCode: b.batch_code,
    publicId: b.public_id,
    orgId: b.org_id,
    categoryName: b.category_name,
    handlingMode: b.handling_mode as "COLD_CHAIN" | "NON_COLD_CHAIN",
    distributionStatus: b.distribution_status,
    conditionStatus: b.condition_status,
    dataQualityStatus: b.data_quality_status,
    custodyStage: b.custody_stage,
    paused: b.paused,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    profileSnapshot: b.profile_snapshot,
    latestEvaluation: evalRows[0]
      ? {
          conditionStatus: evalRows[0].condition_status,
          dataQualityStatus: evalRows[0].data_quality_status,
          reasons: evalRows[0].reasons,
          alerts: evalRows[0].operational_alerts,
          evaluatedAt: evalRows[0].created_at,
        }
      : null,
    latestReading: reading
      ? {
          readAt: reading.read_at,
          deviceHealth: reading.device_health,
          values: latestMeasurements.map((m) => ({
            code: m.parameter_code,
            unit: m.unit,
            valuePPM: m.value_ppm,
          })),
        }
      : null,
    evaluationHistory: evalRows.map((e) => ({
      id: e.id,
      conditionStatus: e.condition_status,
      dataQualityStatus: e.data_quality_status,
      reasons: e.reasons,
      alerts: e.operational_alerts,
      evaluatedAt: e.created_at,
    })),
    recentReadings: readingRows.map((r) => ({
      id: r.id,
      readAt: r.read_at,
      deviceHealth: r.device_health,
      scenario: r.scenario,
      values: measurements
        .filter((m) => m.reading_id === r.id)
        .map((m) => ({
          code: m.parameter_code,
          unit: m.unit,
          valuePPM: m.value_ppm,
        })),
    })),
    handoffs: handoffs.map((h) => ({
      fromStage: h.from_stage,
      toStage: h.to_stage,
      confirmedAt: h.confirmed_at,
      pointName: h.point_name,
    })),
    pendingIntent: intents[0]
      ? {
          id: intents[0].id,
          toStage: intents[0].to_stage,
          expiresAt: intents[0].expires_at,
          status: intents[0].status,
        }
      : null,
    chainSyncStatus: b.chain_sync_status,
    chainTxHash: tx[0]?.chain_tx_hash ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Serah-terima list                                                   */
/* ------------------------------------------------------------------ */

export interface HandoffListItem {
  intentId: string;
  batchId: string;
  batchCode: string;
  fromStage: number;
  toStage: number;
  senderOrgName: string;
  recipientOrgName: string;
  status: string;
  initiatedAt: string;
  confirmedAt: string | null;
  expiresAt: string;
  isRecipient: boolean;
  isSender: boolean;
  canConfirm: boolean;
  canCancel: boolean;
}

export async function listHandoffs(db: DbAdapter, session: Session): Promise<HandoffListItem[]> {
  const orgIds = session.memberships.map((m) => m.orgId);
  if (orgIds.length === 0) return [];
  const roles = session.memberships.map((m) => m.role);
  const myWallet = (session.user.walletAddress ?? "").toLowerCase();

  const rows = await db.query<{
    id: string;
    batch_id: string;
    batch_code: string;
    from_stage: number;
    to_stage: number;
    sender_org: string;
    recipient_org: string;
    sender_org_id: string;
    recipient_org_id: string;
    status: string;
    initiated_at: string;
    confirmed_at: string | null;
    expires_at: string;
    sender_wallet: string;
    recipient_wallet: string;
  }>(
    `select i.id, i.batch_id, b.batch_code, i.from_stage, i.to_stage,
            so.name as sender_org, ro.name as recipient_org,
            b.org_id as sender_org_id, i.recipient_org_id,
            i.status, i.initiated_at, i.confirmed_at, i.expires_at,
            i.sender_wallet, i.recipient_wallet
     from handoff_intents i
     join batches b on b.id = i.batch_id
     join orgs so on so.id = b.org_id
     join orgs ro on ro.id = i.recipient_org_id
     where b.org_id = any($1::uuid[]) or i.recipient_org_id = any($1::uuid[]) or b.custodian_org_id = any($1::uuid[])
     order by i.initiated_at desc limit 100`,
    [orgIds],
  );

  return rows.map((r) => {
    const isPending = r.status === "PENDING";
    const isRecipientOrg = orgIds.includes(r.recipient_org_id);
    const isSenderOrg = orgIds.includes(r.sender_org_id);
    const hasRecipientRole =
      (r.to_stage === 1 && roles.includes("DISTRIBUTOR_ADMIN")) ||
      (r.to_stage === 2 && roles.includes("RETAILER_ADMIN"));
    const hasSenderRole =
      (r.from_stage === 0 &&
        (roles.includes("PRODUCER_ADMIN") || roles.includes("FACTORY_STAFF"))) ||
      (r.from_stage === 1 && roles.includes("DISTRIBUTOR_ADMIN"));

    const canConfirm =
      isPending &&
      (isRecipientOrg || r.recipient_wallet.toLowerCase() === myWallet) &&
      hasRecipientRole;
    const canCancel =
      isPending && (isSenderOrg || r.sender_wallet.toLowerCase() === myWallet) && hasSenderRole;

    return {
      intentId: r.id,
      batchId: r.batch_id,
      batchCode: r.batch_code,
      fromStage: r.from_stage,
      toStage: r.to_stage,
      senderOrgName: r.sender_org,
      recipientOrgName: r.recipient_org,
      status: r.status,
      initiatedAt: r.initiated_at,
      confirmedAt: r.confirmed_at,
      expiresAt: r.expires_at,
      isRecipient: canConfirm,
      isSender: canCancel,
      canConfirm,
      canCancel,
    };
  });
}

/** Batch yang bisa diinisiasi handoff (kustodian org = user org, stage < 2). */
export async function listHandoffableBatches(
  db: DbAdapter,
  session: Session,
): Promise<Array<{ id: string; batchCode: string; custodyStage: number }>> {
  const wallet = session.user.walletAddress;
  if (!wallet) return [];
  const orgIds = session.memberships.map((m) => m.orgId);
  const rows = await db.query<{ id: string; batch_code: string; custody_stage: number }>(
    `select b.id, b.batch_code, b.custody_stage
     from batches b
     where (b.custodian_wallet = $1 or b.custodian_org_id = any($2::uuid[]) or (b.custody_stage = 0 and b.org_id = any($2::uuid[])))
       and b.custody_stage < 2 and b.paused = false
       and not exists (select 1 from handoff_intents i
            where i.batch_id = b.id and i.status = 'PENDING')`,
    [wallet, orgIds],
  );
  return rows.map((r) => ({
    id: r.id,
    batchCode: r.batch_code,
    custodyStage: r.custody_stage,
  }));
}

/** Batch dengan intent PENDING untuk user (konfirmasi penerima). */
export async function listPendingConfirmations(
  db: DbAdapter,
  session: Session,
): Promise<Array<{ batchId: string; batchCode: string; intentId: string; expiresAt: string }>> {
  const wallet = session.user.walletAddress;
  if (!wallet) return [];
  const rows = await db.query<{
    batch_id: string;
    batch_code: string;
    intent_id: string;
    expires_at: string;
  }>(
    `select i.batch_id, b.batch_code, i.id as intent_id, i.expires_at
     from handoff_intents i join batches b on b.id = i.batch_id
     where i.recipient_wallet = $1 and i.status = 'PENDING' and i.expires_at > now()`,
    [wallet],
  );
  return rows.map((r) => ({
    batchId: r.batch_id,
    batchCode: r.batch_code,
    intentId: r.intent_id,
    expiresAt: r.expires_at,
  }));
}

export interface RecipientContact {
  userId: string;
  name: string;
  email: string;
  role: string;
  walletAddress: string;
}

export interface RecipientOrgOption {
  id: string;
  name: string;
  defaultWallet: string;
  contacts: RecipientContact[];
}

/** Org tujuan untuk handoff dari stage tertentu beserta daftar kontak berwenang. */
export async function listRecipientOrgOptions(
  db: DbAdapter,
  fromStage: number,
): Promise<RecipientOrgOption[]> {
  // stage 0 → distributor; stage 1 → retailer
  const kind = fromStage === 0 ? "DISTRIBUTOR" : "RETAILER";
  const rows = await db.query<{
    org_id: string;
    org_name: string;
    user_id: string | null;
    display_name: string | null;
    email: string | null;
    wallet_address: string | null;
    role: string | null;
  }>(
    `select o.id as org_id, o.name as org_name,
            u.id as user_id, u.display_name, u.email, u.wallet_address, m.role
     from orgs o
     left join memberships m on m.org_id = o.id
     left join app_users u on u.id = m.user_id and u.status = 'ACTIVE'
     where o.kind = $1
     order by o.name, u.display_name`,
    [kind],
  );

  const orgMap = new Map<string, RecipientOrgOption>();
  for (const r of rows) {
    let org = orgMap.get(r.org_id);
    if (!org) {
      org = {
        id: r.org_id,
        name: r.org_name,
        defaultWallet: "",
        contacts: [],
      };
      orgMap.set(r.org_id, org);
    }
    if (r.user_id && r.wallet_address) {
      const contact: RecipientContact = {
        userId: r.user_id,
        name: r.display_name || r.email || "Petugas Terotorisasi",
        email: r.email || "",
        role: r.role || "",
        walletAddress: r.wallet_address,
      };
      org.contacts.push(contact);
      if (!org.defaultWallet) {
        org.defaultWallet = r.wallet_address;
      }
    }
  }

  return Array.from(orgMap.values());
}

/* ------------------------------------------------------------------ */
/* Titik distribusi                                                    */
/* ------------------------------------------------------------------ */

export interface DistributionPointItem {
  id: string;
  orgId: string;
  orgName: string;
  publicName: string;
  isActive: boolean;
  internalNotes: string | null;
  schedules: Array<{ id: string; weekday: number; start: string; end: string }>;
  assignedUserNames: string[];
  activeAccessCodesCount: number;
}

const weekdayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function weekdayLabel(weekday: number): string {
  return weekdayNames[weekday] ?? String(weekday);
}

export async function listDistributionPoints(
  db: DbAdapter,
  session: Session,
): Promise<DistributionPointItem[]> {
  const orgIds = session.memberships.map((m) => m.orgId);
  if (orgIds.length === 0) return [];
  const rows = await db.query<{
    id: string;
    org_id: string;
    org_name: string;
    public_name: string;
    is_active: boolean;
    internal_notes: string | null;
  }>(
    `select p.id, p.org_id, o.name as org_name, p.public_name, p.is_active, p.internal_notes
     from distribution_points p join orgs o on o.id = p.org_id
     where p.org_id = any($1::uuid[]) order by p.public_name`,
    [orgIds],
  );
  const points = rows.map((r) => ({
    id: r.id,
    orgId: r.org_id,
    orgName: r.org_name,
    publicName: r.public_name,
    isActive: r.is_active,
    internalNotes: r.internal_notes,
    schedules: [] as DistributionPointItem["schedules"],
    assignedUserNames: [] as string[],
    activeAccessCodesCount: 0,
  }));
  if (points.length === 0) return points;

  const pointIds = points.map((p) => p.id);
  const schedules = await db.query<{
    id: string;
    point_id: string;
    weekday: number;
    start_time: string;
    end_time: string;
  }>(
    `select id, point_id, weekday, start_time::text as start_time, end_time::text as end_time
     from distribution_point_schedules where point_id = any($1::uuid[]) order by weekday, start_time`,
    [pointIds],
  );
  for (const s of schedules) {
    const p = points.find((x) => x.id === s.point_id);
    if (p)
      p.schedules.push({
        id: s.id,
        weekday: s.weekday,
        start: s.start_time.slice(0, 5),
        end: s.end_time.slice(0, 5),
      });
  }

  const assignments = await db.query<{ point_id: string; display_name: string }>(
    `select a.point_id, u.display_name from point_assignments a
     join app_users u on u.id = a.user_id where a.point_id = any($1::uuid[])`,
    [pointIds],
  );
  for (const a of assignments) {
    const p = points.find((x) => x.id === a.point_id);
    if (p) p.assignedUserNames.push(a.display_name);
  }

  const accessCounts = await db.query<{ point_id: string; cnt: number }>(
    `select point_id, count(*)::int as cnt from access_codes
     where point_id = any($1::uuid[]) and valid_until > now()
     group by point_id`,
    [pointIds],
  );
  for (const ac of accessCounts) {
    const p = points.find((x) => x.id === ac.point_id);
    if (p) p.activeAccessCodesCount = ac.cnt;
  }

  return points;
}

/* ------------------------------------------------------------------ */
/* Laporan                                                             */
/* ------------------------------------------------------------------ */

export interface ReportMetrics {
  monitoredBatches: number;
  complianceRate: number;
  verificationOutcomes: Array<{ outcome: string; count: number }>;
  trend: Array<{ day: string; compliant: number; atRisk: number }>;
  evidence: Array<{
    id: string;
    batchCode: string;
    eventType: string;
    eventTime: string;
    txHash: string | null;
    syncStatus: string;
  }>;
}

export async function getReportMetrics(
  db: DbAdapter,
  session: Session,
  days = 14,
): Promise<ReportMetrics> {
  const orgIds = session.memberships.map((m) => m.orgId);
  if (orgIds.length === 0) {
    return {
      monitoredBatches: 0,
      complianceRate: 0,
      verificationOutcomes: [],
      trend: [],
      evidence: [],
    };
  }

  const totals = await db.query<{ monitored: number; compliant: number }>(
    `select count(*)::int as monitored,
       count(*) filter (where condition_status = 'COMPLIANT')::int as compliant
     from batches where org_id = any($1::uuid[]) or custodian_org_id = any($1::uuid[])`,
    [orgIds],
  );
  const t = totals[0];

  const outcomes = await db.query<{ outcome: string; count: number }>(
    `select result as outcome, count(*)::int as count
     from access_attempts a join batches b on b.id = a.batch_id
     where (b.org_id = any($1::uuid[]) or b.custodian_org_id = any($1::uuid[]))
       and a.attempted_at >= now() - ($2::int * interval '1 day')
     group by result order by count desc`,
    [orgIds, days],
  );

  const trend = await db.query<{ day: string; compliant: number; at_risk: number }>(
    `select to_char(d.day, 'YYYY-MM-DD') as day,
       count(e.id) filter (where e.condition_status = 'COMPLIANT')::int as compliant,
       count(e.id) filter (where e.condition_status = 'AT_RISK')::int as at_risk
     from generate_series(current_date - (($2::int - 1) * interval '1 day'), current_date, interval '1 day') as d(day)
     left join condition_evaluations e
       on date_trunc('day', e.created_at) = d.day
       and e.batch_id in (select id from batches where org_id = any($1::uuid[]) or custodian_org_id = any($1::uuid[]))
     group by d.day order by d.day`,
    [orgIds, days],
  );

  const evidence = await db.query<{
    id: string;
    batch_code: string;
    event_type: string;
    created_at: string;
    chain_tx_hash: string | null;
    chain_sync_status: string;
  }>(
    `select r.id, b.batch_code, r.event_type, r.created_at, r.chain_tx_hash, r.chain_sync_status
     from transaction_references r
     left join batches b on b.id = r.batch_id
     where r.batch_id in (select id from batches where org_id = any($1::uuid[]) or custodian_org_id = any($1::uuid[]))
     order by r.created_at desc limit 50`,
    [orgIds],
  );

  return {
    monitoredBatches: t.monitored,
    complianceRate: t.monitored > 0 ? Math.round((t.compliant / t.monitored) * 100) : 0,
    verificationOutcomes: outcomes,
    trend: trend.map((r) => ({ day: r.day, compliant: r.compliant, atRisk: r.at_risk })),
    evidence: evidence.map((r) => ({
      id: r.id,
      batchCode: r.batch_code,
      eventType: r.event_type,
      eventTime: r.created_at,
      txHash: r.chain_tx_hash,
      syncStatus: r.chain_sync_status,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Pengaturan                                                          */
/* ------------------------------------------------------------------ */

export interface CategoryProfileView {
  categoryId: string;
  categoryName: string;
  handlingMode: "COLD_CHAIN" | "NON_COLD_CHAIN";
  profiles: Array<{
    profileId: string;
    version: number;
    isLocked: boolean;
    staleAfterSeconds: number;
    rules: Array<{
      code: string;
      unit: string;
      required: boolean;
      minPPM: string | null;
      maxPPM: string | null;
      toleranceSeconds: number | null;
      severity: string;
    }>;
  }>;
}

export async function listCategoryProfiles(
  db: DbAdapter,
  session: Session,
): Promise<CategoryProfileView[]> {
  const orgIds = session.memberships.map((m) => m.orgId);
  if (orgIds.length === 0) return [];

  const cats = await db.query<{
    id: string;
    name: string;
    handling_mode: string;
  }>(
    `select distinct c.id, c.name, c.handling_mode from product_categories c
     where c.org_id = any($1::uuid[])
        or exists (select 1 from batches b where b.category_id = c.id and (b.org_id = any($1::uuid[]) or b.custodian_org_id = any($1::uuid[])))
     order by c.name`,
    [orgIds],
  );

  const profiles = await db.query<{
    id: string;
    category_id: string;
    version: number;
    is_locked: boolean;
    stale_after_seconds: number;
  }>(
    `select p.id, p.category_id, p.version, p.is_locked, p.stale_after_seconds
     from monitoring_profiles p join product_categories c on c.id = p.category_id
     where c.org_id = any($1::uuid[])
        or exists (select 1 from batches b where b.category_id = c.id and (b.org_id = any($1::uuid[]) or b.custodian_org_id = any($1::uuid[])))
     order by c.name, p.version desc`,
    [orgIds],
  );

  const rules = await db.query<{
    profile_id: string;
    parameter_code: string;
    unit: string;
    required: boolean;
    min_value_ppm: string | null;
    max_value_ppm: string | null;
    tolerance_seconds: number | null;
    severity: string;
  }>(
    `select r.profile_id, r.parameter_code, d.unit, r.required,
            r.min_value_ppm, r.max_value_ppm, r.tolerance_seconds, r.severity
     from profile_parameter_rules r
     join monitoring_parameter_definitions d on d.code = r.parameter_code
     join monitoring_profiles p on p.id = r.profile_id
     join product_categories c on c.id = p.category_id
     where c.org_id = any($1::uuid[])
        or exists (select 1 from batches b where b.category_id = c.id and (b.org_id = any($1::uuid[]) or b.custodian_org_id = any($1::uuid[])))`,
    [orgIds],
  );

  return cats.map((c) => ({
    categoryId: c.id,
    categoryName: c.name,
    handlingMode: c.handling_mode as "COLD_CHAIN" | "NON_COLD_CHAIN",
    profiles: profiles
      .filter((p) => p.category_id === c.id)
      .map((p) => ({
        profileId: p.id,
        version: p.version,
        isLocked: p.is_locked,
        staleAfterSeconds: p.stale_after_seconds,
        rules: rules
          .filter((r) => r.profile_id === p.id)
          .map((r) => ({
            code: r.parameter_code,
            unit: r.unit,
            required: r.required,
            minPPM: r.min_value_ppm,
            maxPPM: r.max_value_ppm,
            toleranceSeconds: r.tolerance_seconds,
            severity: r.severity,
          })),
      })),
  }));
}

/** Opsi kategori+profil untuk form daftar batch (registerBatch). */
export async function listCategoryOptions(
  db: DbAdapter,
  session: Session,
): Promise<
  Array<{
    categoryId: string;
    categoryName: string;
    handlingMode: "COLD_CHAIN" | "NON_COLD_CHAIN";
    profiles: Array<{ profileId: string; version: number }>;
  }>
> {
  const cats = await listCategoryProfiles(db, session);
  return cats.map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.categoryName,
    handlingMode: c.handlingMode,
    profiles: c.profiles.map((p) => ({ profileId: p.profileId, version: p.version })),
  }));
}

/** Titik yang ditugaskan ke user (untuk form verifikasi). */
export async function listMyAssignedPoints(
  db: DbAdapter,
  session: Session,
): Promise<Array<{ id: string; publicName: string; orgName: string }>> {
  const rows = await db.query<{ id: string; public_name: string; org_name: string }>(
    `select p.id, p.public_name, o.name as org_name
     from point_assignments a
     join distribution_points p on p.id = a.point_id
     join orgs o on o.id = p.org_id
     where a.user_id = $1 and p.is_active = true
     order by p.public_name`,
    [session.user.id],
  );
  return rows.map((r) => ({
    id: r.id,
    publicName: r.public_name,
    orgName: r.org_name,
  }));
}
