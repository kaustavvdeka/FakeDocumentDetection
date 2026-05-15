const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const hashService = require("../services/hashService");
const { proofChainContract, signer } = require("../services/blockchain");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("File type not supported. Allowed: PDF, PNG, JPG, DOC, DOCX"));
    }
  },
});

// POST /api/documents/register - Register a document on blockchain
router.post("/register", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const { ownerAddress, documentType, issuerName } = req.body;
    if (!ownerAddress || !documentType) {
      return res.status(400).json({ success: false, error: "ownerAddress and documentType are required" });
    }

    // Read file and generate hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const { hexHash, bytes32Hash } = hashService.generateDocumentHash(fileBuffer);

    // Use filename as IPFS hash placeholder (would be actual IPFS in production)
    const ipfsHash = `local://${req.file.filename}`;

    if (!proofChainContract) {
      return res.status(503).json({ success: false, error: "Smart contract not deployed. Run deployment first." });
    }

    // Register on blockchain
    const tx = await proofChainContract.registerDocument(
      bytes32Hash,
      ownerAddress,
      ipfsHash,
      documentType
    );
    const receipt = await tx.wait();

    res.json({
      success: true,
      data: {
        documentHash: hexHash,
        bytes32Hash,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        ownerAddress,
        documentType,
        ipfsHash,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/documents/:hash - Get document details
router.get("/:hash", async (req, res) => {
  try {
    const hash = req.params.hash.startsWith("0x") ? req.params.hash : "0x" + req.params.hash;
    if (!proofChainContract) {
      return res.status(503).json({ success: false, error: "Contract not deployed" });
    }
    const doc = await proofChainContract.getDocument(hash);
    res.json({
      success: true,
      data: {
        documentHash: doc.documentHash,
        issuer: doc.issuer,
        owner: doc.owner,
        timestamp: Number(doc.timestamp),
        ipfsHash: doc.ipfsHash,
        documentType: doc.documentType,
        issuerName: doc.issuerName,
        isRevoked: doc.isRevoked,
      },
    });
  } catch (error) {
    res.status(404).json({ success: false, error: "Document not found" });
  }
});

// GET /api/documents/owner/:address - Get documents by owner
router.get("/owner/:address", async (req, res) => {
  try {
    if (!proofChainContract) {
      return res.status(503).json({ success: false, error: "Contract not deployed" });
    }
    const hashes = await proofChainContract.getOwnerDocuments(req.params.address);
    const documents = [];
    for (const hash of hashes) {
      try {
        const doc = await proofChainContract.getDocument(hash);
        documents.push({
          documentHash: doc.documentHash,
          issuer: doc.issuer,
          owner: doc.owner,
          timestamp: Number(doc.timestamp),
          documentType: doc.documentType,
          issuerName: doc.issuerName,
          isRevoked: doc.isRevoked,
        });
      } catch (e) { /* skip */ }
    }
    res.json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/documents/revoke - Revoke a document
router.post("/revoke", async (req, res) => {
  try {
    const { documentHash } = req.body;
    if (!documentHash) {
      return res.status(400).json({ success: false, error: "documentHash required" });
    }
    const hash = documentHash.startsWith("0x") ? documentHash : "0x" + documentHash;
    const tx = await proofChainContract.revokeDocument(hash);
    const receipt = await tx.wait();
    res.json({ success: true, transactionHash: receipt.hash });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
