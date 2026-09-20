/**
 * Deploy AgrichainLedger ke Polygon Amoy (IMPLEMENTATION-PLAN §5.2).
 * Jalankan: npx hardhat run contracts/deploy/amoy-deploy.ts --network amoy
 *
 * Prasyarat env:
 * - EVALUATOR_PRIVATE_KEY  : wallet backend (deployer → DEFAULT_ADMIN + EVALUATOR)
 * - REGISTRAR_ADDRESS, DISTRIBUTOR_ADDRESS, RETAILER_ADDRESS: embedded wallet tujuan
 *
 * Output: address + ABI tersimpan ke artifacts/ + dicetak untuk .env
 */
import hre from "hardhat";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

try {
  process.loadEnvFile();
} catch {
  // Abaikan jika file .env tidak ditemukan
}

async function main() {
  const conn = await hre.network.getOrCreate();
  const signers = await conn.ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error(
      "Tidak ada signer yang ditemukan! Pastikan EVALUATOR_PRIVATE_KEY sudah diset di file .env dan memiliki prefix 0x.",
    );
  }
  const [deployer] = signers;
  console.log("Deployer:", deployer.address);

  const balance = await conn.ethers.provider.getBalance(deployer.address);
  const balancePol = Number(conn.ethers.formatEther(balance));
  console.log("Saldo Deployer:", balancePol.toFixed(4), "POL");

  if (balancePol < 0.2) {
    throw new Error(
      `\n❌ Saldo wallet deployer (${deployer.address}) adalah ${balancePol.toFixed(4)} POL, masih kurang untuk biaya deploy!\n` +
        `Deploy kontrak AgrichainLedger membutuhkan gas sekitar 2.260.000 unit (~0.15 - 0.25 POL pada gas price saat ini).\n` +
        `Silakan klaim tambahan testnet POL dari faucet (disarankan minimal 0.3 - 0.5 POL agar aman):\n` +
        `- https://faucet.polygon.technology/\n` +
        `- https://faucet.quicknode.com/polygon/amoy\n`,
    );
  }

  const registrar = process.env.REGISTRAR_ADDRESS;
  const distributor = process.env.DISTRIBUTOR_ADDRESS;
  const retailer = process.env.RETAILER_ADDRESS;

  const Ledger = await (
    await hre.network.getOrCreate()
  ).ethers.getContractFactory("AgrichainLedger");
  const ledger = await Ledger.deploy({ gasLimit: 3000000 });
  await ledger.waitForDeployment();
  const address = await ledger.getAddress();
  console.log("AgrichainLedger deployed @", address);

  // Grant roles ke embedded wallet (least privilege)
  if (registrar) {
    await (await ledger.grantRole(await ledger.REGISTRAR_ROLE(), registrar)).wait();
    console.log("REGISTRAR_ROLE →", registrar);
  }
  if (distributor) {
    await (await ledger.grantRole(await ledger.DISTRIBUTOR_ROLE(), distributor)).wait();
    console.log("DISTRIBUTOR_ROLE →", distributor);
  }
  if (retailer) {
    await (await ledger.grantRole(await ledger.RETAILER_ROLE(), retailer)).wait();
    console.log("RETAILER_ROLE →", retailer);
  }

  // Simpan ABI untuk src/server/chain
  const artifact = await hre.artifacts.readArtifact("AgrichainLedger");
  mkdirSync(path.resolve("artifacts/deployed"), { recursive: true });
  writeFileSync(
    path.resolve("artifacts/deployed/agrichain-ledger.json"),
    JSON.stringify({ address, abi: artifact.abi, deployedAt: new Date().toISOString() }, null, 2),
  );
  console.log("ABI + address → artifacts/deployed/agrichain-ledger.json");
  console.log("\nTambahkan ke .env:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
