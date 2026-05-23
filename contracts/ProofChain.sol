// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProofChain
 * @notice Optimized enterprise-grade contract for document verification and audit trails on blockchain
 */
contract ProofChain is AccessControl, ReentrancyGuard {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Custom errors for gas efficiency
    error DocumentAlreadyExists(bytes32 documentHash);
    error DocumentDoesNotExist(bytes32 documentHash);
    error IssuerAlreadyRegistered(address issuerAddress);
    error IssuerNotActive(address issuerAddress);
    error InvalidOwnerAddress();
    error InvalidIPFSHash();
    error Unauthorized(address caller);
    error InvalidInputLength();
    error DocumentAlreadyRevoked(bytes32 documentHash);

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

    struct VerificationLog {
        address verifier;
        uint256 timestamp;
        bool isAuthentic;
    }

    // Mapping from document hash to Document struct
    mapping(bytes32 => Document) public documents;
    
    // Mapping from issuer address to Issuer details
    mapping(address => Issuer) public issuers;
    
    // Mapping from owner address to their document hashes
    mapping(address => bytes32[]) public ownerDocuments;
    
    // Mapping from issuer address to their issued document hashes
    mapping(address => bytes32[]) public issuerDocuments;

    // Mapping from document hash to verification log history
    mapping(bytes32 => VerificationLog[]) private verificationLogs;

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
     */
    function registerIssuer(
        address _issuerAddress,
        string calldata _name,
        string calldata _category,
        string calldata _website
    ) external onlyRole(ADMIN_ROLE) {
        if (issuers[_issuerAddress].isActive) revert IssuerAlreadyRegistered(_issuerAddress);
        if (bytes(_name).length == 0) revert InvalidOwnerAddress();

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
        if (!issuers[_issuerAddress].isActive) revert IssuerNotActive(_issuerAddress);
        issuers[_issuerAddress].isActive = false;
        _revokeRole(ISSUER_ROLE, _issuerAddress);

        emit IssuerDeactivated(_issuerAddress, block.timestamp);
    }

    // ==================== DOCUMENT MANAGEMENT ====================

    /**
     * @notice Register a new document on-chain
     */
    function registerDocument(
        bytes32 _documentHash,
        address _owner,
        string calldata _ipfsHash,
        string calldata _documentType
    ) external onlyRole(ISSUER_ROLE) nonReentrant {
        if (documents[_documentHash].exists) revert DocumentAlreadyExists(_documentHash);
        if (_owner == address(0)) revert InvalidOwnerAddress();
        if (bytes(_ipfsHash).length == 0) revert InvalidIPFSHash();
        if (!issuers[msg.sender].isActive) revert IssuerNotActive(msg.sender);

        _registerSingleDocument(_documentHash, _owner, _ipfsHash, _documentType);
    }

    /**
     * @notice Register multiple documents in batch for gas efficiency
     */
    function registerDocumentsBatch(
        bytes32[] calldata _hashes,
        address[] calldata _owners,
        string[] calldata _ipfsHashes,
        string[] calldata _documentTypes
    ) external onlyRole(ISSUER_ROLE) nonReentrant {
        uint256 len = _hashes.length;
        if (len != _owners.length || len != _ipfsHashes.length || len != _documentTypes.length) {
            revert InvalidInputLength();
        }
        if (!issuers[msg.sender].isActive) revert IssuerNotActive(msg.sender);

        for (uint256 i = 0; i < len; i++) {
            bytes32 docHash = _hashes[i];
            if (documents[docHash].exists) revert DocumentAlreadyExists(docHash);
            if (_owners[i] == address(0)) revert InvalidOwnerAddress();
            if (bytes(_ipfsHashes[i]).length == 0) revert InvalidIPFSHash();

            _registerSingleDocument(docHash, _owners[i], _ipfsHashes[i], _documentTypes[i]);
        }
    }

    /**
     * @dev Internal helper for registration logic
     */
    function _registerSingleDocument(
        bytes32 _documentHash,
        address _owner,
        string memory _ipfsHash,
        string memory _documentType
    ) internal {
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
     * @notice Verify a document and write a verification log to the blockchain
     */
    function verifyDocument(bytes32 _documentHash) 
        external 
        returns (bool isAuthentic, Document memory doc) 
    {
        totalVerifications++;
        
        if (!documents[_documentHash].exists) {
            verificationLogs[_documentHash].push(VerificationLog({
                verifier: msg.sender,
                timestamp: block.timestamp,
                isAuthentic: false
            }));
            emit DocumentVerified(_documentHash, msg.sender, false, block.timestamp);
            return (false, doc);
        }

        doc = documents[_documentHash];
        isAuthentic = !doc.isRevoked;

        verificationLogs[_documentHash].push(VerificationLog({
            verifier: msg.sender,
            timestamp: block.timestamp,
            isAuthentic: isAuthentic
        }));

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
     * @notice Verify multiple document hashes in a single call (view only)
     */
    function verifyDocumentsBatch(bytes32[] calldata _hashes)
        external
        view
        returns (bool[] memory isAuthenticList, Document[] memory docList)
    {
        uint256 len = _hashes.length;
        isAuthenticList = new bool[](len);
        docList = new Document[](len);

        for (uint256 i = 0; i < len; i++) {
            bytes32 hash = _hashes[i];
            if (documents[hash].exists) {
                docList[i] = documents[hash];
                isAuthenticList[i] = !documents[hash].isRevoked;
            } else {
                isAuthenticList[i] = false;
            }
        }
        return (isAuthenticList, docList);
    }

    /**
     * @notice Retrieve the verification history of a document hash
     */
    function getVerificationLogs(bytes32 _documentHash)
        external
        view
        returns (VerificationLog[] memory)
    {
        return verificationLogs[_documentHash];
    }

    /**
     * @notice Revoke a document (issuer only or admin)
     */
    function revokeDocument(bytes32 _documentHash) external {
        if (!documents[_documentHash].exists) revert DocumentDoesNotExist(_documentHash);
        if (documents[_documentHash].issuer != msg.sender && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert Unauthorized(msg.sender);
        }
        if (documents[_documentHash].isRevoked) revert DocumentAlreadyRevoked(_documentHash);

        documents[_documentHash].isRevoked = true;

        emit DocumentRevoked(_documentHash, msg.sender, block.timestamp);
    }

    // ==================== QUERY FUNCTIONS ====================

    function getOwnerDocuments(address _owner) external view returns (bytes32[] memory) {
        return ownerDocuments[_owner];
    }

    function getIssuerDocuments(address _issuer) external view returns (bytes32[] memory) {
        return issuerDocuments[_issuer];
    }

    function getDocument(bytes32 _documentHash) external view returns (Document memory) {
        if (!documents[_documentHash].exists) revert DocumentDoesNotExist(_documentHash);
        return documents[_documentHash];
    }

    function getIssuer(address _issuerAddress) external view returns (Issuer memory) {
        return issuers[_issuerAddress];
    }

    function getStats() external view returns (
        uint256 _totalDocuments,
        uint256 _totalIssuers,
        uint256 _totalVerifications
    ) {
        return (totalDocuments, totalIssuers, totalVerifications);
    }

    function isActiveIssuer(address _addr) external view returns (bool) {
        return issuers[_addr].isActive;
    }

    function getOwnerDocumentCount(address _owner) external view returns (uint256) {
        return ownerDocuments[_owner].length;
    }
}
