import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { getDbAdapter } from "@/server/db/adapter";
import { requireRequestSession } from "@/server/auth/request-session";
import {
  encodeLedgerCall,
  getLedgerAddress,
  getLedgerProvider,
  verifyLedgerReceipt,
} from "@/server/chain/ledger";

export const runtime = "nodejs";
const inputSchema = z.object({
  transactionReferenceId: z.string().uuid(),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

type ReferenceRow = {
  id: string;
  event_type: string;
  chain_sync_status: string;
  chain_batch_key: string;
  org_id: string;
  public_id: string;
  custodian_wallet: string | null;
  custodian_org_id: string | null;
  recipient_wallet: string | null;
  recipient_org_id: string | null;
  expires_at: string | null;
};

async function referenceForSession(
  id: string,
  session: Awaited<ReturnType<typeof requireRequestSession>>,
) {
  const db = await getDbAdapter();
  const rows = await db.query<ReferenceRow>(
    `select tr.id, tr.event_type, tr.chain_sync_status, b.chain_batch_key, b.org_id, b.public_id,
            b.custodian_wallet, b.custodian_org_id, hi.recipient_wallet, hi.recipient_org_id, hi.expires_at
     from transaction_references tr join batches b on b.id = tr.batch_id
     left join handoff_intents hi on hi.id = tr.intent_id where tr.id = $1`,
    [id],
  );
  const reference = rows[0];
  if (
    !reference ||
    !session.memberships.some((membership) => membership.orgId === reference.org_id)
  )
    throw new Error("FORBIDDEN");
  return { db, reference };
}

function chainCall(reference: ReferenceRow) {
  const hash = (value: string) => `0x${createHash("sha256").update(value).digest("hex")}`;
  const values: Record<string, string | number> = { batchKey: reference.chain_batch_key };
  if (reference.event_type === "BATCH_REGISTERED")
    Object.assign(values, {
      publicIdHash: hash(reference.public_id),
      custodianWallet: reference.custodian_wallet ?? "",
      orgHash: hash(reference.custodian_org_id ?? ""),
    });
  if (reference.event_type === "HANDOFF_INITIATED")
    Object.assign(values, {
      recipientWallet: reference.recipient_wallet ?? "",
      recipientOrgHash: hash(reference.recipient_org_id ?? ""),
      expiresAt: Math.floor(new Date(reference.expires_at ?? 0).getTime() / 1000),
    });
  const data = encodeLedgerCall(reference.event_type, values);
  if (!data) throw new Error("UNSUPPORTED_EVENT");
  return { transactionReferenceId: reference.id, to: getLedgerAddress(), data };
}

export async function GET(request: Request) {
  try {
    const session = await requireRequestSession(request);
    const id = new URL(request.url).searchParams.get("referenceId");
    if (!id || !z.string().uuid().safeParse(id).success) throw new Error("INVALID");
    const { reference } = await referenceForSession(id, session);
    if (reference.chain_sync_status !== "PENDING") throw new Error("INVALID");
    return NextResponse.json(chainCall(reference));
  } catch {
    return NextResponse.json({ error: "Transaksi tidak dapat disiapkan." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRequestSession(request);
    const input = inputSchema.parse(await request.json());
    const { db, reference } = await referenceForSession(input.transactionReferenceId, session);
    if (reference.chain_sync_status !== "PENDING") throw new Error("INVALID");
    const receipt = await getLedgerProvider().getTransactionReceipt(input.txHash);
    if (
      receipt &&
      !verifyLedgerReceipt(
        { eventType: reference.event_type, chainBatchKey: reference.chain_batch_key },
        receipt,
      )
    )
      throw new Error("INVALID_RECEIPT");
    await db.query(
      "update transaction_references set chain_tx_hash = $2, updated_at = now() where id = $1 and chain_tx_hash is null",
      [reference.id, input.txHash],
    );
    return NextResponse.json({ status: receipt ? "CONFIRMED" : "PENDING" });
  } catch {
    return NextResponse.json({ error: "Transaksi tidak dapat diverifikasi." }, { status: 400 });
  }
}
