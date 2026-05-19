// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title MerkleDocumentRegistry
 * @notice Gas-efficient bulk document registration using Merkle Trees.
 *         A university can register 1000 certificates in ONE transaction.
 *         Users prove their individual document with a Merkle Proof.
 * @dev Supports zk-style privacy: only root hash stored, not individual hashes.
 */
contract MerkleDocumentRegistry is AccessControl, ReentrancyGuard {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");

    struct BatchRecord {
        bytes32   merkleRoot;       // Root of all document hashes in this batch
        address   issuer;           // Who submitted this batch
        string    issuerName;       // Human-readable name
        string    ipfsBatchCID;     // IPFS CID pointing to the full manifest JSON
        string    batchLabel;       // e.g. "MIT Graduation 2025"
        string    documentType;     // degree | certificate | patent | etc.
        uint256   documentCount;    // How many documents are in this batch
        uint256   timestamp;
        bool      isRevoked;
        bool      exists;
    }

    // AI confidence score stored per batch (0-100, 100 = fully authentic)
    struct AIScore {
        uint8   forgeryScore;       // 0=clean, 100=definitely forged
        uint8   plagiarismScore;    // 0=original, 100=plagiarised
        uint8   aiContentScore;     // 0=human-written, 100=AI-generated
        string  ocrSummary;         // Extracted key entity summary
        uint256 analysedAt;
    }

    mapping(bytes32 => BatchRecord) public batches;           // merkleRoot => BatchRecord
    mapping(bytes32 => AIScore)    public batchAIScores;      // merkleRoot => AIScore
    mapping(address => bytes32[])  public issuerBatches;      // issuer => list of roots
    mapping(bytes32 => bool)       public revokedLeaves;      // individual leaf revocation

    bytes32[] public allRoots;
    uint256   public totalBatches;
    uint256   public totalDocumentsRegistered;

    // ── Events ──────────────────────────────────────────────────────────────
    event BatchRegistered(
        bytes32 indexed merkleRoot,
        address indexed issuer,
        string  batchLabel,
        uint256 documentCount,
        uint256 timestamp
    );
    event BatchRevoked(bytes32 indexed merkleRoot, address indexed by, uint256 timestamp);
    event LeafRevoked(bytes32 indexed leaf, bytes32 indexed merkleRoot, address indexed by);
    event AIScoreRecorded(bytes32 indexed merkleRoot, uint8 forgery, uint8 plagiarism, uint8 aiContent);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }

    // ── Issuer Registration ─────────────────────────────────────────────────
    function grantIssuer(address _addr) external onlyRole(ADMIN_ROLE) {
        _grantRole(ISSUER_ROLE, _addr);
    }
    function revokeIssuer(address _addr) external onlyRole(ADMIN_ROLE) {
        _revokeRole(ISSUER_ROLE, _addr);
    }

    // ── Batch Registration ──────────────────────────────────────────────────
    /**
     * @notice Register an entire batch of documents under a single Merkle root.
     * @param _merkleRoot     The root hash computed off-chain from all document hashes
     * @param _ipfsBatchCID   IPFS CID of the JSON manifest listing every document CID
     * @param _batchLabel     Human-readable label for this batch
     * @param _documentType   Type of documents in this batch
     * @param _documentCount  Number of documents
     * @param _issuerName     Human-readable issuer name
     */
    function registerBatch(
        bytes32 _merkleRoot,
        string  memory _ipfsBatchCID,
        string  memory _batchLabel,
        string  memory _documentType,
        uint256 _documentCount,
        string  memory _issuerName
    ) external onlyRole(ISSUER_ROLE) nonReentrant {
        require(!batches[_merkleRoot].exists,    "Batch already registered");
        require(_documentCount > 0,              "Empty batch");
        require(bytes(_ipfsBatchCID).length > 0, "IPFS CID required");

        batches[_merkleRoot] = BatchRecord({
            merkleRoot:    _merkleRoot,
            issuer:        msg.sender,
            issuerName:    _issuerName,
            ipfsBatchCID:  _ipfsBatchCID,
            batchLabel:    _batchLabel,
            documentType:  _documentType,
            documentCount: _documentCount,
            timestamp:     block.timestamp,
            isRevoked:     false,
            exists:        true
        });

        issuerBatches[msg.sender].push(_merkleRoot);
        allRoots.push(_merkleRoot);

        totalBatches++;
        totalDocumentsRegistered += _documentCount;

        emit BatchRegistered(_merkleRoot, msg.sender, _batchLabel, _documentCount, block.timestamp);
    }

    // ── Individual Document Proof Verification ──────────────────────────────
    /**
     * @notice Verify a single document against a batch using its Merkle proof.
     * @param _merkleRoot The batch root (stored on-chain)
     * @param _leaf       SHA-256 hash of the individual document (keccak256 of it)
     * @param _proof      Merkle proof path (generated off-chain)
     * @return valid      True if document is part of the batch and not revoked
     * @return batch      The full BatchRecord for the matched root
     */
    function verifyDocument(
        bytes32   _merkleRoot,
        bytes32   _leaf,
        bytes32[] calldata _proof
    ) external view returns (bool valid, BatchRecord memory batch) {
        batch = batches[_merkleRoot];
        if (!batch.exists || batch.isRevoked || revokedLeaves[_leaf]) {
            return (false, batch);
        }
        valid = MerkleProof.verify(_proof, _merkleRoot, _leaf);
    }

    // ── AI Score Storage ────────────────────────────────────────────────────
    /**
     * @notice Store AI analysis scores for a batch on-chain.
     *         Called by the backend after running the AI pipeline.
     */
    function recordAIScore(
        bytes32 _merkleRoot,
        uint8   _forgery,
        uint8   _plagiarism,
        uint8   _aiContent,
        string  memory _ocrSummary
    ) external onlyRole(ISSUER_ROLE) {
        require(batches[_merkleRoot].exists, "Batch not found");
        batchAIScores[_merkleRoot] = AIScore({
            forgeryScore:    _forgery,
            plagiarismScore: _plagiarism,
            aiContentScore:  _aiContent,
            ocrSummary:      _ocrSummary,
            analysedAt:      block.timestamp
        });
        emit AIScoreRecorded(_merkleRoot, _forgery, _plagiarism, _aiContent);
    }

    // ── Revocation ──────────────────────────────────────────────────────────
    function revokeBatch(bytes32 _merkleRoot) external {
        BatchRecord storage b = batches[_merkleRoot];
        require(b.exists,   "Batch not found");
        require(!b.isRevoked, "Already revoked");
        require(b.issuer == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");
        b.isRevoked = true;
        emit BatchRevoked(_merkleRoot, msg.sender, block.timestamp);
    }

    function revokeLeaf(bytes32 _leaf, bytes32 _merkleRoot) external {
        require(batches[_merkleRoot].exists, "Batch not found");
        require(batches[_merkleRoot].issuer == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");
        revokedLeaves[_leaf] = true;
        emit LeafRevoked(_leaf, _merkleRoot, msg.sender);
    }

    // ── Queries ─────────────────────────────────────────────────────────────
    function getBatch(bytes32 _merkleRoot) external view returns (BatchRecord memory) {
        require(batches[_merkleRoot].exists, "Batch not found");
        return batches[_merkleRoot];
    }

    function getAIScore(bytes32 _merkleRoot) external view returns (AIScore memory) {
        return batchAIScores[_merkleRoot];
    }

    function getIssuerBatches(address _issuer) external view returns (bytes32[] memory) {
        return issuerBatches[_issuer];
    }

    function getAllRoots() external view returns (bytes32[] memory) {
        return allRoots;
    }

    function getStats() external view returns (
        uint256 _totalBatches,
        uint256 _totalDocuments
    ) {
        return (totalBatches, totalDocumentsRegistered);
    }
}
