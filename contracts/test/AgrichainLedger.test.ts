import { expect } from "chai";
import hre from "hardhat";
import { keccak256, toUtf8Bytes, type Provider } from "ethers";

/**
 * Suite kontrak AgrichainLedger (IMPLEMENTATION-PLAN §5.1 + §5.0) — Hardhat 3.
 * Pattern HH3: hre.network.connect() → connection.ethers.
 */

const MARKER = "TEST-CODE-DO-NOT-LEAK";

function batchKeyOf(orgId: string, batchId: string): string {
  return keccak256(toUtf8Bytes(orgId + "|" + batchId));
}

// Cache koneksi per-test-file (mocha sequential)
let connection: Awaited<ReturnType<typeof hre.network.getOrCreate>> | null = null;
async function conn() {
  if (!connection) connection = await hre.network.getOrCreate();
  return connection;
}

async function now(): Promise<number> {
  return (await (await conn()).ethers.provider.getBlock("latest"))!.timestamp;
}

async function deployFixture() {
  const c = await conn();
  const [admin, registrar, distributor, retailer, outsider] = await c.ethers.getSigners();
  const Ledger = await c.ethers.getContractFactory("AgrichainLedger");
  const ledger = await Ledger.connect(admin).deploy();
  await ledger.waitForDeployment();

  const ledgerAsAdmin = ledger.connect(admin);
  await ledgerAsAdmin.grantRole(await ledger.REGISTRAR_ROLE(), registrar.address);
  await ledgerAsAdmin.grantRole(await ledger.DISTRIBUTOR_ROLE(), distributor.address);
  await ledgerAsAdmin.grantRole(await ledger.RETAILER_ROLE(), retailer.address);
  // admin (deployer) = DEFAULT_ADMIN + EVALUATOR (wallet backend)

  const key = batchKeyOf("org-1", "batch-1");
  const publicIdHash = keccak256(toUtf8Bytes("AG23-7QXB-KF4M-9R2T"));
  const orgHash = keccak256(toUtf8Bytes("org-1"));
  const distOrgHash = keccak256(toUtf8Bytes("org-2"));
  const retailOrgHash = keccak256(toUtf8Bytes("org-3"));

  return {
    ledger,
    admin,
    registrar,
    distributor,
    retailer,
    outsider,
    key,
    publicIdHash,
    orgHash,
    distOrgHash,
    retailOrgHash,
  };
}

type F = Awaited<ReturnType<typeof deployFixture>>;

async function registerBatch(f: F, custodian?: string) {
  await f.ledger
    .connect(f.registrar)
    .registerBatch(f.key, f.publicIdHash, custodian ?? f.admin.address, f.orgHash);
}

async function initHandoff(f: F, expiresInSec = 3600) {
  await f.ledger
    .connect(f.admin)
    .initiateHandoff(f.key, f.distributor.address, f.distOrgHash, (await now()) + expiresInSec);
}

describe("AgrichainLedger — registerBatch (D2)", () => {
  it("sukses: event + status DIDAFTARKAN + conditionStatus NONE + kustodian", async () => {
    const f = await deployFixture();
    await expect(
      f.ledger
        .connect(f.registrar)
        .registerBatch(f.key, f.publicIdHash, f.admin.address, f.orgHash),
    ).to.emit(f.ledger, "BatchRegistered");
    const b = await f.ledger.getBatch(f.key);
    expect(b.distributionStatus).to.equal(0n);
    expect(b.conditionStatus).to.equal(0n); // NONE default — tidak salah dibaca COMPLIANT
    expect(b.custodyStage).to.equal(0n);
    expect(b.currentCustodian).to.equal(f.admin.address);
  });

  it("duplicate → revert DUPLICATE", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await expect(
      f.ledger
        .connect(f.registrar)
        .registerBatch(f.key, f.publicIdHash, f.admin.address, f.orgHash),
    ).to.be.revertedWith("DUPLICATE");
  });

  it("tanpa role → AccessControlUnauthorizedAccount", async () => {
    const f = await deployFixture();
    await expect(
      f.ledger.connect(f.outsider).registerBatch(f.key, f.publicIdHash, f.admin.address, f.orgHash),
    ).to.be.revertedWithCustomError(f.ledger, "AccessControlUnauthorizedAccount");
  });

  it("saat pause → EnforcedPause", async () => {
    const f = await deployFixture();
    await f.ledger.pause();
    await expect(
      f.ledger
        .connect(f.registrar)
        .registerBatch(f.key, f.publicIdHash, f.admin.address, f.orgHash),
    ).to.be.revertedWithCustomError(f.ledger, "EnforcedPause");
  });
});

describe("AgrichainLedger — handoff dua konfirmasi (D3)", () => {
  it("inisiasi valid: event, stage belum berpindah, pending tersimpan", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await expect(
      f.ledger
        .connect(f.admin)
        .initiateHandoff(f.key, f.distributor.address, f.distOrgHash, (await now()) + 3600),
    ).to.emit(f.ledger, "HandoffInitiated");
    expect((await f.ledger.getBatch(f.key)).custodyStage).to.equal(0n);
    const p = await f.ledger.getPendingHandoff(f.key);
    expect(p.exists).to.equal(true);
    expect(p.recipientWallet).to.equal(f.distributor.address);
    expect(p.toStage).to.equal(1n);
  });

  it("inisiasi oleh non-kustodian → WRONG_SENDER", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await expect(
      f.ledger
        .connect(f.outsider)
        .initiateHandoff(f.key, f.distributor.address, f.distOrgHash, (await now()) + 3600),
    ).to.be.revertedWith("WRONG_SENDER");
  });

  it("inisiasi ganda saat PENDING → PENDING_HANDOFF_EXISTS", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await initHandoff(f);
    await expect(
      f.ledger
        .connect(f.admin)
        .initiateHandoff(f.key, f.retailer.address, f.distOrgHash, (await now()) + 3600),
    ).to.be.revertedWith("PENDING_HANDOFF_EXISTS");
  });

  it("inisiasi dengan expiry masa lalu → HANDOFF_EXPIRED_AT_INITIATION", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await expect(
      f.ledger
        .connect(f.admin)
        .initiateHandoff(f.key, f.distributor.address, f.distOrgHash, (await now()) - 10),
    ).to.be.revertedWith("HANDOFF_EXPIRED_AT_INITIATION");
  });

  it("konfirmasi oleh wallet lain → WRONG_RECIPIENT", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await initHandoff(f);
    await expect(f.ledger.connect(f.outsider).confirmHandoff(f.key)).to.be.revertedWith(
      "WRONG_RECIPIENT",
    );
  });

  it("penerima tanpa role DISTRIBUTOR → WRONG_ROLE", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await f.ledger
      .connect(f.admin)
      .initiateHandoff(f.key, f.outsider.address, f.distOrgHash, (await now()) + 3600);
    await expect(f.ledger.connect(f.outsider).confirmHandoff(f.key)).to.be.revertedWith(
      "WRONG_ROLE",
    );
  });

  it("konfirmasi setelah expiry → HANDOFF_EXPIRED", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await initHandoff(f, 10);
    const c = await conn();
    await c.ethers.provider.send("evm_increaseTime", [60]);
    await c.ethers.provider.send("evm_mine", []);
    await expect(f.ledger.connect(f.distributor).confirmHandoff(f.key)).to.be.revertedWith(
      "HANDOFF_EXPIRED",
    );
  });

  it("cancel oleh pengirim → pending hilang; konfirmasi → NO_PENDING_HANDOFF", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await initHandoff(f);
    await expect(f.ledger.connect(f.admin).cancelHandoff(f.key)).to.emit(
      f.ledger,
      "HandoffCancelled",
    );
    expect((await f.ledger.getPendingHandoff(f.key)).exists).to.equal(false);
    await expect(f.ledger.connect(f.distributor).confirmHandoff(f.key)).to.be.revertedWith(
      "NO_PENDING_HANDOFF",
    );
  });

  it("cancel oleh non-kustodian → WRONG_SENDER", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await initHandoff(f);
    await expect(f.ledger.connect(f.outsider).cancelHandoff(f.key)).to.be.revertedWith(
      "WRONG_SENDER",
    );
  });

  it("konfirmasi valid 0→1: stage=1, DALAM_DISTRIBUSI, kustodian baru", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await initHandoff(f);
    await expect(f.ledger.connect(f.distributor).confirmHandoff(f.key)).to.emit(
      f.ledger,
      "HandoffConfirmed",
    );
    const b = await f.ledger.getBatch(f.key);
    expect(b.custodyStage).to.equal(1n);
    expect(b.distributionStatus).to.equal(1n);
    expect(b.currentCustodian).to.equal(f.distributor.address);
    expect((await f.ledger.getPendingHandoff(f.key)).exists).to.equal(false);
  });

  it("konfirmasi valid 1→2: stage=2, SELESAI (setelah 0→1 lengkap)", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    // tahap 0→1 dulu (kustodian awal = admin/pabrik)
    await initHandoff(f);
    await f.ledger.connect(f.distributor).confirmHandoff(f.key);
    // lalu 1→2: distributor (kustodian baru) → retailer
    await f.ledger
      .connect(f.distributor)
      .initiateHandoff(f.key, f.retailer.address, f.retailOrgHash, (await now()) + 3600);
    await expect(f.ledger.connect(f.retailer).confirmHandoff(f.key)).to.emit(
      f.ledger,
      "HandoffConfirmed",
    );
    const b = await f.ledger.getBatch(f.key);
    expect(b.custodyStage).to.equal(2n);
    expect(b.distributionStatus).to.equal(2n); // SELESAI
  });

  it("stage akhir (2): inisiasi → STAGE_JUMP", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await initHandoff(f);
    await f.ledger.connect(f.distributor).confirmHandoff(f.key);
    await f.ledger
      .connect(f.distributor)
      .initiateHandoff(f.key, f.retailer.address, f.retailOrgHash, (await now()) + 3600);
    await f.ledger.connect(f.retailer).confirmHandoff(f.key);
    await expect(
      f.ledger
        .connect(f.retailer)
        .initiateHandoff(f.key, f.admin.address, f.orgHash, (await now()) + 3600),
    ).to.be.revertedWith("STAGE_JUMP");
  });

  it("pause: mutasi ditolak, getBatch/getPendingHandoff tetap jalan", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await f.ledger.pause();
    expect((await f.ledger.getBatch(f.key)).createdAt).to.not.equal(0n);
    expect((await f.ledger.getPendingHandoff(f.key)).exists).to.equal(false);
    await expect(
      f.ledger
        .connect(f.admin)
        .initiateHandoff(f.key, f.distributor.address, f.distOrgHash, (await now()) + 3600),
    ).to.be.revertedWithCustomError(f.ledger, "EnforcedPause");
  });
});

describe("AgrichainLedger — recordCondition (D4, K13)", () => {
  it("COMPLIANT & AT_RISK tercatat; riskFlagCount hanya AT_RISK; distribusi tak tersentuh", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await f.ledger
      .connect(f.admin)
      .recordCondition(f.key, 1, keccak256(toUtf8Bytes("WITHIN_RANGE")));
    expect(await f.ledger.riskFlagCount(f.key)).to.equal(0n);
    await f.ledger
      .connect(f.admin)
      .recordCondition(f.key, 2, keccak256(toUtf8Bytes("OUT_OF_RANGE")));
    expect(await f.ledger.riskFlagCount(f.key)).to.equal(1n);
    const b = await f.ledger.getBatch(f.key);
    expect(b.conditionStatus).to.equal(2n);
    expect(b.distributionStatus).to.equal(0n); // evaluator TIDAK bisa ubah distribusi (K13)
  });

  it("NONE → revert CONDITION_NONE_INVALID", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await expect(
      f.ledger.connect(f.admin).recordCondition(f.key, 0, keccak256(toUtf8Bytes("X"))),
    ).to.be.revertedWith("CONDITION_NONE_INVALID");
  });

  it("non-EVALUATOR → revert", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await expect(
      f.ledger.connect(f.outsider).recordCondition(f.key, 1, keccak256(toUtf8Bytes("X"))),
    ).to.be.revertedWithCustomError(f.ledger, "AccessControlUnauthorizedAccount");
  });

  it("event ConditionEvaluated TIDAK memuat nilai parameter pembacaan", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    const tx = await f.ledger
      .connect(f.admin)
      .recordCondition(f.key, 1, keccak256(toUtf8Bytes("WITHIN_RANGE")));
    const receipt = await tx.wait();
    const iface = f.ledger.interface;
    const ev = receipt!.logs
      .map((l) => {
        try {
          return iface.parseLog({ topics: [...l.topics], data: l.data });
        } catch {
          return null;
        }
      })
      .find((p) => p !== null);
    expect(ev).to.not.equal(null);
    expect(ev!.args.length).to.equal(4); // batchKey, status, reasonCode, at
    const serialized = JSON.stringify(ev!.args.map((a) => String(a)));
    expect(serialized).to.not.include("4000000"); // nilai PPM suhu tidak pernah ada
  });
});

describe("AgrichainLedger — recordValidAccess (D4, K8/K13)", () => {
  it("SAH tercatat + validAccessCount", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await f.ledger
      .connect(f.admin)
      .recordValidAccess(f.key, keccak256(toUtf8Bytes("Akses terverifikasi")));
    expect(await f.ledger.validAccessCount(f.key)).to.equal(1n);
  });

  it("non-EVALUATOR → revert", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await expect(
      f.ledger.connect(f.outsider).recordValidAccess(f.key, keccak256(toUtf8Bytes("X"))),
    ).to.be.revertedWithCustomError(f.ledger, "AccessControlUnauthorizedAccount");
  });

  it("TIDAK ada jalur on-chain untuk TIDAK_SAH/ANOMALI (verifikasi ABI)", async () => {
    const f = await deployFixture();
    const fns = f.ledger.interface.fragments
      .filter((fr) => fr.type === "function")
      .map((fr) => fr.getFunctionFormat?.() ?? fr.name);
    expect(fns).to.include("recordValidAccess");
    expect(fns.filter((n) => n.includes("recordAccess"))).to.have.lengthOf(0);
    expect(JSON.stringify(f.ledger.interface.fragments)).to.not.include("TIDAK_SAH");
  });
});

describe("AgrichainLedger — anchorDigest idempoten (D4, K8/K14)", () => {
  it("periode sama → DIGEST_ALREADY_ANCHORED", async () => {
    const f = await deployFixture();
    const digest = keccak256(toUtf8Bytes("digest-1"));
    const periodKey = keccak256(toUtf8Bytes("2026-09-13T10Z/11Z"));
    await expect(f.ledger.connect(f.admin).anchorDigest(digest, periodKey, 1000, 2000)).to.emit(
      f.ledger,
      "DigestAnchored",
    );
    await expect(
      f.ledger.connect(f.admin).anchorDigest(digest, periodKey, 1000, 2000),
    ).to.be.revertedWith("DIGEST_ALREADY_ANCHORED");
  });

  it("non-EVALUATOR → revert", async () => {
    const f = await deployFixture();
    await expect(
      f.ledger
        .connect(f.outsider)
        .anchorDigest(keccak256(toUtf8Bytes("d")), keccak256(toUtf8Bytes("p")), 0, 1),
    ).to.be.revertedWithCustomError(f.ledger, "AccessControlUnauthorizedAccount");
  });
});

describe("AgrichainLedger — pause/unpause (D4)", () => {
  it("hanya DEFAULT_ADMIN; unpause memulihkan mutasi", async () => {
    const f = await deployFixture();
    await expect(f.ledger.connect(f.outsider).pause()).to.be.revertedWithCustomError(
      f.ledger,
      "AccessControlUnauthorizedAccount",
    );
    await f.ledger.pause();
    await f.ledger.unpause();
    await registerBatch(f);
  });
});

describe("AgrichainLedger — invariant no-leak (§5.1 item 7)", () => {
  it("kode otorisasi mentah TIDAK PERNAH muncul di data transaksi/event", async () => {
    const f = await deployFixture();
    await registerBatch(f);
    await initHandoff(f);
    await f.ledger.connect(f.distributor).confirmHandoff(f.key);
    await f.ledger
      .connect(f.admin)
      .recordCondition(f.key, 1, keccak256(toUtf8Bytes("WITHIN_RANGE")));
    await f.ledger
      .connect(f.admin)
      .recordValidAccess(f.key, keccak256(toUtf8Bytes("Akses terverifikasi")));

    const markerUtf8Hex = Buffer.from(MARKER, "utf8").toString("hex").toLowerCase();
    const c = await conn();
    const provider = c.ethers.provider as Provider;
    const current = await provider.getBlockNumber();
    for (let i = 0; i <= current; i++) {
      const blk = await provider.getBlock(i, true);
      for (const txHash of blk!.transactions as unknown as string[]) {
        const tx = await provider.getTransaction(txHash);
        if (tx?.data) {
          expect(tx.data.toLowerCase()).to.not.include(markerUtf8Hex);
        }
        const rcpt = await provider.getTransactionReceipt(txHash);
        for (const log of rcpt?.logs ?? []) {
          expect(log.data.toLowerCase()).to.not.include(markerUtf8Hex);
          for (const t of log.topics) {
            expect(t.toLowerCase()).to.not.include(markerUtf8Hex);
          }
        }
      }
    }
  });
});
