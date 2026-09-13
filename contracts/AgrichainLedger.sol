// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControlDefaultAdminRules} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AgrichainLedger — catatan audit on-chain Agrichain (IMPLEMENTATION-PLAN §5.0)
 *
 * Prinsip (K6/K7/K8/K13/K17):
 * - batchKey = keccak256(orgId || batchId): identitas on-chain anti-bentrok lintas organisasi
 * - Serah-terima dua konfirmasi: initiateHandoff (pengirim) + confirmHandoff (penerima).
 *   Stage/status distribusi HANYA berubah pada konfirmasi.
 * - recordCondition hanya enum ConditionStatus {NONE, COMPLIANT, AT_RISK}; tanpa nilai
 *   parameter (dinamis off-chain); evaluator tidak dapat menyentuh distribusi.
 * - recordValidAccess tanpa argumen hasil: hanya jalur SAH per-event;
 *   TIDAK_SAH/ANOMALI → off-chain, di-anchor sebagai digest periodik idempoten.
 * - Kontrak TIDAK menyimpan kode otorisasi (mentah maupun hash).
 * - Pause menghentikan mutasi; pembacaan tetap terbuka.
 */
contract AgrichainLedger is AccessControlDefaultAdminRules, Pausable {
    // ---------- roles (least privilege) ----------
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE"); // daftar batch
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE"); // menerima stage 1
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE"); // menerima stage 2
    bytes32 public constant EVALUATOR_ROLE = keccak256("EVALUATOR_ROLE"); // backend: kondisi/akses/digest

    // ---------- enums ----------
    enum DistributionStatus { DIDAFTARKAN, DALAM_DISTRIBUSI, SELESAI }
    enum ConditionStatus { NONE, COMPLIANT, AT_RISK } // NONE default — anti salah-baca storage

    // ---------- structs ----------
    struct BatchInfo {
        bytes32 publicIdHash;          // keccak256(public_id) — bukan nilai mentah
        address currentCustodian;      // wallet kustodian saat ini
        bytes32 currentOrgHash;        // keccak256(org uuid) kustodian
        uint8 custodyStage;            // 0/1/2
        DistributionStatus distributionStatus;
        ConditionStatus conditionStatus;
        uint64 createdAt;
    }

    struct PendingHandoff {
        address sender;                // kustodian inisiator (pengirim)
        address recipientWallet;       // wallet penerima yang ditetapkan
        bytes32 recipientOrgHash;     // organisasi penerima
        uint8 fromStage;
        uint8 toStage;
        uint64 initiatedAt;
        uint64 expiresAt;
        bool exists;
    }

    // ---------- storage ----------
    mapping(bytes32 => BatchInfo) public batches;                          // key: batchKey
    mapping(bytes32 => PendingHandoff) public pendingHandoffs;             // key: batchKey
    mapping(bytes32 => uint256) public riskFlagCount;                      // evaluasi AT_RISK per batch
    mapping(bytes32 => uint256) public validAccessCount;                   // akses SAH per batch
    mapping(bytes32 => mapping(bytes32 => bool)) public anchoredDigests;  // digest idempoten (periodKey)

    // ---------- events (audit trail) ----------
    event BatchRegistered(bytes32 indexed batchKey, bytes32 publicIdHash, address indexed registrar, uint64 at);
    event HandoffInitiated(bytes32 indexed batchKey, address indexed sender, address indexed recipient, bytes32 recipientOrgHash, uint8 fromStage, uint8 toStage, uint64 expiresAt, uint64 at);
    event HandoffConfirmed(bytes32 indexed batchKey, address indexed sender, address indexed recipient, uint8 fromStage, uint8 toStage, uint64 at);
    event HandoffCancelled(bytes32 indexed batchKey, address indexed sender, uint64 at);
    event ConditionEvaluated(bytes32 indexed batchKey, ConditionStatus status, bytes32 reasonCode, uint64 at);
    event ValidAccessRecorded(bytes32 indexed batchKey, bytes32 publicReasonHash, uint64 at);
    event DigestAnchored(bytes32 indexed digest, bytes32 indexed periodKey, uint256 periodStart, uint256 periodEnd, uint64 at);

    // ---------- modifiers ----------
    modifier batchExists(bytes32 batchKey) {
        require(batches[batchKey].createdAt != 0, "BATCH_NOT_FOUND");
        _;
    }
    modifier onlyCustodian(bytes32 batchKey) {
        require(msg.sender == batches[batchKey].currentCustodian, "WRONG_SENDER");
        _;
    }

    constructor() AccessControlDefaultAdminRules(0, msg.sender) {
        // default admin = msg.sender (via AccessControlDefaultAdminRules);
        // TIDAK perlu _grantRole(DEFAULT_ADMIN_ROLE) — double grant akan revert.
        _grantRole(EVALUATOR_ROLE, msg.sender);
    }

    // ============ registrasi (K17: batchKey hash org+batch) ============
    function registerBatch(
        bytes32 batchKey,
        bytes32 publicIdHash,
        address custodian,
        bytes32 custodianOrgHash
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused {
        require(batches[batchKey].createdAt == 0, "DUPLICATE");
        batches[batchKey] = BatchInfo({
            publicIdHash: publicIdHash,
            currentCustodian: custodian,
            currentOrgHash: custodianOrgHash,
            custodyStage: 0,
            distributionStatus: DistributionStatus.DIDAFTARKAN,
            conditionStatus: ConditionStatus.NONE,
            createdAt: uint64(block.timestamp)
        });
        emit BatchRegistered(batchKey, publicIdHash, msg.sender, uint64(block.timestamp));
    }

    // ============ handoff dua konfirmasi (K7) ============
    function initiateHandoff(
        bytes32 batchKey,
        address recipientWallet,
        bytes32 recipientOrgHash,
        uint64 expiresAt
    ) external batchExists(batchKey) onlyCustodian(batchKey) whenNotPaused {
        require(!pendingHandoffs[batchKey].exists, "PENDING_HANDOFF_EXISTS");
        uint8 fromStage = batches[batchKey].custodyStage;
        require(fromStage < 2, "STAGE_JUMP"); // stage akhir tidak bisa kirim
        uint8 toStage = fromStage + 1;
        require(expiresAt > block.timestamp, "HANDOFF_EXPIRED_AT_INITIATION");
        require(recipientWallet != address(0), "RECIPIENT_ZERO");

        pendingHandoffs[batchKey] = PendingHandoff({
            sender: msg.sender,
            recipientWallet: recipientWallet,
            recipientOrgHash: recipientOrgHash,
            fromStage: fromStage,
            toStage: toStage,
            initiatedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            exists: true
        });
        emit HandoffInitiated(batchKey, msg.sender, recipientWallet, recipientOrgHash, fromStage, toStage, expiresAt, uint64(block.timestamp));
    }

    function confirmHandoff(bytes32 batchKey)
        external
        batchExists(batchKey)
        whenNotPaused
    {
        PendingHandoff storage p = pendingHandoffs[batchKey];
        require(p.exists, "NO_PENDING_HANDOFF");
        require(msg.sender == p.recipientWallet, "WRONG_RECIPIENT");
        require(p.toStage == batches[batchKey].custodyStage + 1, "STAGE_MISMATCH");
        require(block.timestamp <= p.expiresAt, "HANDOFF_EXPIRED");
        // role penerima dicek on-chain (least privilege):
        if (p.toStage == 1) {
            require(hasRole(DISTRIBUTOR_ROLE, msg.sender), "WRONG_ROLE");
        } else {
            require(hasRole(RETAILER_ROLE, msg.sender), "WRONG_ROLE");
        }

        BatchInfo storage b = batches[batchKey];
        b.custodyStage = p.toStage;
        b.currentCustodian = p.recipientWallet;
        b.currentOrgHash = p.recipientOrgHash;
        if (b.distributionStatus == DistributionStatus.DIDAFTARKAN) {
            b.distributionStatus = DistributionStatus.DALAM_DISTRIBUSI;
        } else if (p.toStage == 2) {
            b.distributionStatus = DistributionStatus.SELESAI;
        }

        emit HandoffConfirmed(batchKey, p.sender, p.recipientWallet, p.fromStage, p.toStage, uint64(block.timestamp));
        delete pendingHandoffs[batchKey];
    }

    function cancelHandoff(bytes32 batchKey)
        external
        batchExists(batchKey)
        onlyCustodian(batchKey)
        whenNotPaused
    {
        PendingHandoff storage p = pendingHandoffs[batchKey];
        require(p.exists, "NO_PENDING_HANDOFF");
        // pengirim intent = kustodian saat ini (onlyCustodian sudah memastikan)
        emit HandoffCancelled(batchKey, msg.sender, uint64(block.timestamp));
        delete pendingHandoffs[batchKey];
    }

    // ============ evaluasi kondisi (K13: hanya enum, tanpa nilai parameter) ============
    function recordCondition(bytes32 batchKey, ConditionStatus status, bytes32 reasonCode)
        external
        batchExists(batchKey)
        onlyRole(EVALUATOR_ROLE)
        whenNotPaused
    {
        require(status != ConditionStatus.NONE, "CONDITION_NONE_INVALID");
        if (status == ConditionStatus.AT_RISK) {
            riskFlagCount[batchKey] += 1;
        }
        batches[batchKey].conditionStatus = status;
        emit ConditionEvaluated(batchKey, status, reasonCode, uint64(block.timestamp));
    }

    // ============ akses SAH per-event (K8: tanpa argumen hasil) ============
    function recordValidAccess(bytes32 batchKey, bytes32 publicReasonHash)
        external
        batchExists(batchKey)
        onlyRole(EVALUATOR_ROLE)
        whenNotPaused
    {
        validAccessCount[batchKey] += 1;
        emit ValidAccessRecorded(batchKey, publicReasonHash, uint64(block.timestamp));
    }

    // ============ digest periodik (K8/K14: idempoten per periode) ============
    function anchorDigest(
        bytes32 digest,
        bytes32 periodKey,
        uint256 periodStart,
        uint256 periodEnd
    ) external onlyRole(EVALUATOR_ROLE) whenNotPaused {
        require(!anchoredDigests[periodKey][digest], "DIGEST_ALREADY_ANCHORED");
        anchoredDigests[periodKey][digest] = true;
        emit DigestAnchored(digest, periodKey, periodStart, periodEnd, uint64(block.timestamp));
    }

    // ============ pembacaan (tetap terbuka saat pause — PRD) ============
    function getBatch(bytes32 batchKey) external view returns (BatchInfo memory) {
        return batches[batchKey];
    }

    function getPendingHandoff(bytes32 batchKey) external view returns (PendingHandoff memory) {
        return pendingHandoffs[batchKey];
    }

    // ============ pause darurat (hanya DEFAULT_ADMIN = CONTRACT_ADMIN) ============
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
