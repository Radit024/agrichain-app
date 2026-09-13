import { getDbAdapter } from "@/server/db/adapter";
import { getLedgerReader } from "@/server/chain/ledger-reader";
import { reconcileChainWrites } from "@/server/chain/reconcile";

let running = false;

export async function runReconciliation(
  apiKey: string | undefined,
): Promise<{ confirmed: number; stillPending: number; failed: number }> {
  if (!process.env.RECONCILE_API_KEY || apiKey !== process.env.RECONCILE_API_KEY)
    throw new Error("RECONCILE_API_KEY tidak sah");
  if (running) throw new Error("RECONCILIATION_ALREADY_RUNNING");
  running = true;
  try {
    return await reconcileChainWrites(await getDbAdapter(), getLedgerReader());
  } finally {
    running = false;
  }
}

async function main() {
  const report = await runReconciliation(process.env.RECONCILE_API_KEY);
  console.log(JSON.stringify(report));
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("workers/reconcile/index.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "RECONCILIATION_FAILED");
    process.exitCode = 1;
  });
}
