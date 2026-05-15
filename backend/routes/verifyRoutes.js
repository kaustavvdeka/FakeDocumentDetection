const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const hashService = require("../services/hashService");
const { proofChainContract } = require("../services/blockchain");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/verify/document - Verify a document by uploading it
router.post("/document", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }
    if (!proofChainContract) {
      return res.status(503).json({ success: false, error: "Contract not deployed" });
    }

    const { hexHash, bytes32Hash } = hashService.generateDocumentHash(req.file.buffer);

    const [isAuthentic, doc] = await proofChainContract.verifyDocumentView(bytes32Hash);

    if (isAuthentic) {
      res.json({
        success: true,
        verified: true,
        status: "AUTHENTIC",
        message: "✅ Document is authentic and verified on blockchain",
        data: {
          documentHash: hexHash,
          issuer: doc.issuer,
          owner: doc.owner,
          timestamp: Number(doc.timestamp),
          documentType: doc.documentType,
          issuerName: doc.issuerName,
          isRevoked: doc.isRevoked,
          registeredAt: new Date(Number(doc.timestamp) * 1000).toISOString(),
        },
      });
    } else if (doc.exists) {
      res.json({
        success: true,
        verified: false,
        status: "REVOKED",
        message: "⚠️ Document exists but has been revoked",
        data: { documentHash: hexHash },
      });
    } else {
      res.json({
        success: true,
        verified: false,
        status: "NOT_FOUND",
        message: "❌ Document NOT found on blockchain — may be forged or unregistered",
        data: { documentHash: hexHash },
      });
    }
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/verify/hash - Verify by hash string
router.post("/hash", async (req, res) => {
  try {
    const { hash } = req.body;
    if (!hash) return res.status(400).json({ success: false, error: "Hash required" });
    if (!proofChainContract) {
      return res.status(503).json({ success: false, error: "Contract not deployed" });
    }

    const bytes32Hash = hash.startsWith("0x") ? hash : "0x" + hash;
    const [isAuthentic, doc] = await proofChainContract.verifyDocumentView(bytes32Hash);

    res.json({
      success: true,
      verified: isAuthentic,
      status: isAuthentic ? "AUTHENTIC" : (doc.exists ? "REVOKED" : "NOT_FOUND"),
      data: isAuthentic ? {
        issuer: doc.issuer,
        owner: doc.owner,
        timestamp: Number(doc.timestamp),
        documentType: doc.documentType,
        issuerName: doc.issuerName,
      } : { hash },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
