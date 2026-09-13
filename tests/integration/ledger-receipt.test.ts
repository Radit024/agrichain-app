import { afterEach, describe, expect, it, vi } from "vitest";
import { Interface, type TransactionReceipt } from "ethers";

vi.mock("server-only", () => ({}));

import { ledgerAbi, verifyLedgerReceipt } from "@/server/chain/ledger";

const address = "0x1000000000000000000000000000000000000001";
const batchKey = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const publicIdHash = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
});

describe("ledger receipt verification", () => {
  it("only accepts the expected event from the configured ledger", () => {
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = address;
    const iface = new Interface(ledgerAbi);
    const event = iface.getEvent("BatchRegistered")!;
    const encoded = iface.encodeEventLog(event, [batchKey, publicIdHash, address, 1]);
    const receipt = {
      status: 1,
      logs: [{ address, topics: encoded.topics, data: encoded.data }],
    } as unknown as TransactionReceipt;
    expect(
      verifyLedgerReceipt({ eventType: "BATCH_REGISTERED", chainBatchKey: batchKey }, receipt),
    ).toBe(true);
    expect(
      verifyLedgerReceipt({ eventType: "HANDOFF_INITIATED", chainBatchKey: batchKey }, receipt),
    ).toBe(false);
    const wrongAddress = {
      ...receipt,
      logs: [
        {
          address: "0x2000000000000000000000000000000000000002",
          topics: encoded.topics,
          data: encoded.data,
        },
      ],
    } as TransactionReceipt;
    expect(
      verifyLedgerReceipt({ eventType: "BATCH_REGISTERED", chainBatchKey: batchKey }, wrongAddress),
    ).toBe(false);
  });
});
