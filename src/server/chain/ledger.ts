import "server-only";

import { Interface, JsonRpcProvider, getAddress, isAddress, type TransactionReceipt } from "ethers";

export const ledgerAbi = [
  "event BatchRegistered(bytes32 indexed batchKey, bytes32 publicIdHash, address indexed registrar, uint64 at)",
  "event HandoffInitiated(bytes32 indexed batchKey, address indexed sender, address indexed recipient, bytes32 recipientOrgHash, uint8 fromStage, uint8 toStage, uint64 expiresAt, uint64 at)",
  "event HandoffConfirmed(bytes32 indexed batchKey, address indexed sender, address indexed recipient, uint8 fromStage, uint8 toStage, uint64 at)",
  "event HandoffCancelled(bytes32 indexed batchKey, address indexed sender, uint64 at)",
  "event ValidAccessRecorded(bytes32 indexed batchKey, bytes32 publicReasonHash, uint64 at)",
  "function registerBatch(bytes32 batchKey, bytes32 publicIdHash, address custodian, bytes32 custodianOrgHash)",
  "function initiateHandoff(bytes32 batchKey, address recipientWallet, bytes32 recipientOrgHash, uint64 expiresAt)",
  "function confirmHandoff(bytes32 batchKey)",
  "function cancelHandoff(bytes32 batchKey)",
] as const;

const iface = new Interface(ledgerAbi);
const eventForType: Record<string, string> = {
  BATCH_REGISTERED: "BatchRegistered",
  HANDOFF_INITIATED: "HandoffInitiated",
  HANDOFF_CONFIRMED: "HandoffConfirmed",
  HANDOFF_CANCELLED: "HandoffCancelled",
  VALID_ACCESS: "ValidAccessRecorded",
};

export interface LedgerReference {
  eventType: string;
  chainBatchKey: string;
}

export function getLedgerAddress(): string {
  const value = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!value || !isAddress(value))
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS tidak valid atau belum di-set");
  return getAddress(value);
}

export function getLedgerProvider(): JsonRpcProvider {
  const rpc = process.env.POLYGON_AMOY_RPC;
  if (!rpc) throw new Error("POLYGON_AMOY_RPC wajib di-set");
  return new JsonRpcProvider(rpc);
}

export function verifyLedgerReceipt(
  reference: LedgerReference,
  receipt: TransactionReceipt,
): boolean {
  if (receipt.status !== 1 || !eventForType[reference.eventType]) return false;
  const address = getLedgerAddress().toLowerCase();
  return receipt.logs.some((log) => {
    if (log.address.toLowerCase() !== address) return false;
    try {
      const parsed = iface.parseLog(log);
      return (
        parsed?.name === eventForType[reference.eventType] &&
        String(parsed.args.batchKey).toLowerCase() === reference.chainBatchKey.toLowerCase()
      );
    } catch {
      return false;
    }
  });
}

export function encodeLedgerCall(
  eventType: string,
  values: Record<string, string | number | bigint>,
): string | null {
  switch (eventType) {
    case "BATCH_REGISTERED":
      return iface.encodeFunctionData("registerBatch", [
        values.batchKey,
        values.publicIdHash,
        values.custodianWallet,
        values.orgHash,
      ]);
    case "HANDOFF_INITIATED":
      return iface.encodeFunctionData("initiateHandoff", [
        values.batchKey,
        values.recipientWallet,
        values.recipientOrgHash,
        values.expiresAt,
      ]);
    case "HANDOFF_CONFIRMED":
      return iface.encodeFunctionData("confirmHandoff", [values.batchKey]);
    case "HANDOFF_CANCELLED":
      return iface.encodeFunctionData("cancelHandoff", [values.batchKey]);
    default:
      return null;
  }
}
