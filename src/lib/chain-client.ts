"use client";

import { BrowserProvider, type Eip1193Provider } from "ethers";

export interface PreparedChainCall {
  transactionReferenceId: string;
  to: string;
  data: string;
}

/** Sign through a Privy embedded wallet, then let the server verify the receipt/event. */
export async function submitPreparedChainCall(
  provider: Eip1193Provider,
  accessToken: string,
  call: PreparedChainCall,
): Promise<string> {
  const signer = await new BrowserProvider(provider).getSigner();
  const transaction = await signer.sendTransaction({ to: call.to, data: call.data });
  const response = await fetch("/api/chain/submit", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      transactionReferenceId: call.transactionReferenceId,
      txHash: transaction.hash,
    }),
  });
  if (!response.ok) throw new Error("Transaksi tidak dapat diverifikasi oleh Agrilink.");
  return transaction.hash;
}
