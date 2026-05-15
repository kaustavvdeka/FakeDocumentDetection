// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SoulboundNFT
 * @notice Non-transferable NFT credentials (Soulbound Tokens)
 * @dev Certificates minted as soulbound NFTs that cannot be transferred
 */
contract SoulboundNFT is ERC721, ERC721URIStorage, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId;

    struct Credential {
        uint256 tokenId;
        address issuer;
        address recipient;
        string credentialType;    // degree, certificate, diploma
        string institution;
        string program;
        string ipfsHash;
        bytes32 documentHash;
        uint256 issuedAt;
        bool isRevoked;
    }

    // Mapping from token ID to credential
    mapping(uint256 => Credential) public credentials;
    
    // Mapping from recipient to their token IDs
    mapping(address => uint256[]) public recipientTokens;
    
    // Mapping from document hash to token ID
    mapping(bytes32 => uint256) public hashToTokenId;

    uint256 public totalCredentials;

    event CredentialMinted(
        uint256 indexed tokenId,
        address indexed issuer,
        address indexed recipient,
        string credentialType,
        bytes32 documentHash,
        uint256 timestamp
    );

    event CredentialRevoked(
        uint256 indexed tokenId,
        address indexed revokedBy,
        uint256 timestamp
    );

    constructor() ERC721("ProofChain Credential", "PCC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @notice Mint a soulbound credential NFT
     */
    function mintCredential(
        address _recipient,
        string memory _credentialType,
        string memory _institution,
        string memory _program,
        string memory _ipfsHash,
        bytes32 _documentHash,
        string memory _tokenURI
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (uint256) {
        require(_recipient != address(0), "Invalid recipient");
        require(hashToTokenId[_documentHash] == 0, "Credential already exists for this document");

        uint256 tokenId = _nextTokenId++;
        _safeMint(_recipient, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        credentials[tokenId] = Credential({
            tokenId: tokenId,
            issuer: msg.sender,
            recipient: _recipient,
            credentialType: _credentialType,
            institution: _institution,
            program: _program,
            ipfsHash: _ipfsHash,
            documentHash: _documentHash,
            issuedAt: block.timestamp,
            isRevoked: false
        });

        recipientTokens[_recipient].push(tokenId);
        hashToTokenId[_documentHash] = tokenId + 1; // +1 to distinguish from default 0
        totalCredentials++;

        emit CredentialMinted(
            tokenId,
            msg.sender,
            _recipient,
            _credentialType,
            _documentHash,
            block.timestamp
        );

        return tokenId;
    }

    /**
     * @notice Revoke a credential
     */
    function revokeCredential(uint256 _tokenId) external {
        require(
            credentials[_tokenId].issuer == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(!credentials[_tokenId].isRevoked, "Already revoked");
        
        credentials[_tokenId].isRevoked = true;
        emit CredentialRevoked(_tokenId, msg.sender, block.timestamp);
    }

    /**
     * @notice Get credential details
     */
    function getCredential(uint256 _tokenId) external view returns (Credential memory) {
        return credentials[_tokenId];
    }

    /**
     * @notice Get all credentials for a recipient
     */
    function getRecipientCredentials(address _recipient) external view returns (uint256[] memory) {
        return recipientTokens[_recipient];
    }

    /**
     * @notice Verify credential by document hash
     */
    function verifyByHash(bytes32 _documentHash) external view returns (bool exists, Credential memory cred) {
        uint256 mappedId = hashToTokenId[_documentHash];
        if (mappedId == 0) {
            return (false, cred);
        }
        uint256 tokenId = mappedId - 1;
        cred = credentials[tokenId];
        exists = !cred.isRevoked;
        return (exists, cred);
    }

    // ==================== SOULBOUND OVERRIDES ====================
    // Prevent transfers (making tokens soulbound)

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        // Allow minting (from == address(0)) but block transfers
        if (from != address(0) && to != address(0)) {
            revert("SoulboundNFT: token is non-transferable");
        }
        return super._update(to, tokenId, auth);
    }

    // ==================== REQUIRED OVERRIDES ====================

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
