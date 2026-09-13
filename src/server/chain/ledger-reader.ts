import "server-only";

import { getLedgerProvider, verifyLedgerReceipt } from "./ledger";
import type { ChainReader } from "./reconcile";

/** Runtime reader used only by worker jobs after Amoy configuration is supplied. */
export function getLedgerReader(): ChainReader {
  const provider = getLedgerProvider();
  return {
    getReceipt: (txHash) => provider.getTransactionReceipt(txHash),
    verifyReceipt: (reference, receipt) => verifyLedgerReceipt(reference, receipt as never),
  };
}
