// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProofChain
 * @notice Main contract for tamper-proof document verification on blockchain
 * @dev Manages document registration, verification, and issuer authorization
 */
contract ProofChain is AccessControl, ReentrancyGuard {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct Document {
        bytes32 documentHash;       // SHA-256 hash of the document
        address issuer;             // Address of the issuing institution
        address owner;              // Address of the document owner
        uint256 timestamp;          // Block timestamp of registration
        string ipfsHash;            // IPFS CID for off-chain storage
        string documentType;        // Type: degree, certificate, ID, etc.
        string issuerName;          // Human-readable issuer name
        bool isRevoked;             // Whether the document has been revoked
        bool exists;                // Whether this record exists
    }

    struct Issuer {
        string name;
        string category;            // university, company, government, etc.
        string website;
        bool isActive;
        uint256 registeredAt;
        uint256 documentsIssued;
    }

    // Mapping from document hash to Document struct
    mapping(bytes32 => Document) public documents;
    
    // Mapping from issuer address to Issuer details
    mapping(address => Issuer) public issuers;
    
    // Mapping from owner address to their document hashes
    mapping(address => bytes32[]) public ownerDocuments;
    
    // Mapping from issuer address to their issued document hashes
    mapping(address => bytes32[]) public issuerDocuments;

    // Array of all document hashes for enumeration
    bytes32[] public allDocumentHashes;
    
    // Array of all issuer addresses
    address[] public allIssuers;

    // Total counts
    uint256 public totalDocuments;
    uint256 public totalIssuers;
    uint256 public totalVerifications;

    // Events
    event DocumentRegistered(
        bytes32 indexed documentHash,
        address indexed issuer,
        address indexed owner,
        string documentType,
        string ipfsHash,
        uint256 timestamp
    );

    event DocumentVerified(
        bytes32 indexed documentHash,
        address indexed verifier,
        bool isAuthentic,
        uint256 timestamp
    );

    event DocumentRevoked(
        bytes32 indexed documentHash,
        address indexed revokedBy,
        uint256 timestamp
    );

    event IssuerRegistered(
        address indexed issuerAddress,
        string name,
        string category,
        uint256 timestamp
    );

    event IssuerDeactivated(
        address indexed issuerAddress,
        uint256 timestamp
    );

    event DocumentTransferred(
        bytes32 indexed documentHash,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);

        // Register deployer as first issuer
        issuers[msg.sender] = Issuer({
            name: "ProofChain Admin",
            category: "platform",
            website: "https://proofchain.io",
            isActive: true,
            registeredAt: block.timestamp,
            documentsIssued: 0
        });
        allIssuers.push(msg.sender);
        totalIssuers = 1;
    }

    // ==================== ISSUER MANAGEMENT ====================

    /**
     * @notice Register a new issuer (admin only)
     * @param _issuerAddress Address of the new issuer
     * @param _name Name of the institution
     * @param _category Category (university, company, government)
     * @param _website Website URL
     */
    function registerIssuer(
        address _issuerAddress,
        string memory _name,
        string memory _category,
        string memory _website
    ) external onlyRole(ADMIN_ROLE) {
        require(!issuers[_issuerAddress].isActive, "Issuer already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");

        issuers[_issuerAddress] = Issuer({
            name: _name,
            category: _category,
            website: _website,
            isActive: true,
            registeredAt: block.timestamp,
            documentsIssued: 0
        });

        _grantRole(ISSUER_ROLE, _issuerAddress);
        allIssuers.push(_issuerAddress);
        totalIssuers++;

        emit IssuerRegistered(_issuerAddress, _name, _category, block.timestamp);
    }

    /**
     * @notice Deactivate an issuer (admin only)
     */
    function deactivateIssuer(address _issuerAddress) external onlyRole(ADMIN_ROLE) {
        require(issuers[_issuerAddress].isActive, "Issuer not active");
        issuers[_issuerAddress].isActive = false;
        _revokeRole(ISSUER_ROLE, _issuerAddress);

        emit IssuerDeactivated(_issuerAddress, block.timestamp);
    }

    // ==================== DOCUMENT MANAGEMENT ====================

    /**
     * @notice Register a new document on-chain
     * @param _documentHash SHA-256 hash of the document
     * @param _owner Address of the document owner/recipient
     * @param _ipfsHash IPFS CID where encrypted document is stored
     * @param _documentType Type of document
     */
    function registerDocument(
        bytes32 _documentHash,
        address _owner,
        string memory _ipfsHash,
        string memory _documentType
    ) external onlyRole(ISSUER_ROLE) nonReentrant {
        require(!documents[_documentHash].exists, "Document already registered");
        require(_owner != address(0), "Invalid owner address");
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(issuers[msg.sender].isActive, "Issuer is not active");

        documents[_documentHash] = Document({
            documentHash: _documentHash,
            issuer: msg.sender,
            owner: _owner,
            timestamp: block.timestamp,
            ipfsHash: _ipfsHash,
            documentType: _documentType,
            issuerName: issuers[msg.sender].name,
            isRevoked: false,
            exists: true
        });

        ownerDocuments[_owner].push(_documentHash);
        issuerDocuments[msg.sender].push(_documentHash);
        allDocumentHashes.push(_documentHash);
        
        issuers[msg.sender].documentsIssued++;
        totalDocuments++;

        emit DocumentRegistered(
            _documentHash,
            msg.sender,
            _owner,
            _documentType,
            _ipfsHash,
            block.timestamp
        );
    }

    /**
     * @notice Verify a document's authenticity
     * @param _documentHash Hash to verify
     * @return isAuthentic Whether document exists and is not revoked
     * @return doc The full document record
     */
    function verifyDocument(bytes32 _documentHash) 
        external 
        returns (bool isAuthentic, Document memory doc) 
    {
        totalVerifications++;
        
        if (!documents[_documentHash].exists) {
            emit DocumentVerified(_documentHash, msg.sender, false, block.timestamp);
            return (false, doc);
        }

        doc = documents[_documentHash];
        isAuthentic = !doc.isRevoked;

        emit DocumentVerified(_documentHash, msg.sender, isAuthentic, block.timestamp);
        return (isAuthentic, doc);
    }

    /**
     * @notice View-only verification (no gas cost)
     */
    function verifyDocumentView(bytes32 _documentHash) 
        external 
        view 
        returns (bool isAuthentic, Document memory doc) 
    {
        if (!documents[_documentHash].exists) {
            return (false, doc);
        }
        doc = documents[_documentHash];
        isAuthentic = !doc.isRevoked;
        return (isAuthentic, doc);
    }

    /**
     * @notice Revoke a document (issuer only)
     */
    function revokeDocument(bytes32 _documentHash) external {
        require(documents[_documentHash].exists, "Document does not exist");
        require(
            documents[_documentHash].issuer == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "Only issuer or admin can revoke"
        );
        require(!documents[_documentHash].isRevoked, "Already revoked");

        documents[_documentHash].isRevoked = true;

        emit DocumentRevoked(_documentHash, msg.sender, block.timestamp);
    }

    // ==================== QUERY FUNCTIONS ====================

    /**
     * @notice Get all documents owned by an address
     */
    function getOwnerDocuments(address _owner) external view returns (bytes32[] memory) {
        return ownerDocuments[_owner];
    }

    /**
     * @notice Get all documents issued by an issuer
     */
    function getIssuerDocuments(address _issuer) external view returns (bytes32[] memory) {
        return issuerDocuments[_issuer];
    }

    /**
     * @notice Get document details
     */
    function getDocument(bytes32 _documentHash) external view returns (Document memory) {
        require(documents[_documentHash].exists, "Document does not exist");
        return documents[_documentHash];
    }

    /**
     * @notice Get issuer details
     */
    function getIssuer(address _issuerAddress) external view returns (Issuer memory) {
        return issuers[_issuerAddress];
    }

    /**
     * @notice Get platform statistics
     */
    function getStats() external view returns (
        uint256 _totalDocuments,
        uint256 _totalIssuers,
        uint256 _totalVerifications
    ) {
        return (totalDocuments, totalIssuers, totalVerifications);
    }

    /**
     * @notice Check if an address is an active issuer
     */
    function isActiveIssuer(address _addr) external view returns (bool) {
        return issuers[_addr].isActive;
    }

    /**
     * @notice Get total documents for an owner
     */
    function getOwnerDocumentCount(address _owner) external view returns (uint256) {
        return ownerDocuments[_owner].length;
    }
}
