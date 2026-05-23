const express = require("express");
const router = express.Router();
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const hashService = require("../services/hashService");
const ipfsService = require("../services/ipfsService");
const cacheService = require("../services/cacheService");
const forgeryDetector = require("../ai/forgeryDetector");
const { proofChainContract } = require("../services/blockchain");

// Configure multer for verification file uploads (in-memory)
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 50 * 1024 * 1024 } 
});

// Rate limiting middleware for verification endpoints (enterprise DDoS/abuse protection)
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 15, // limit each IP to 15 requests per window
  message: {
    success: false,
    error: "Too many verification requests from this IP. Please try again after 60 seconds."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all verify routes
router.use(verifyLimiter);

// Helper function to fetch on-chain logs and format them
async function getVerificationHistory(bytes32Hash) {
  if (!proofChainContract) return [];
  try {
    const logs = await proofChainContract.getVerificationLogs(bytes32Hash);
    return logs.map(l => ({
      verifier: l.verifier,
      timestamp: new Date(Number(l.timestamp) * 1000).toISOString(),
      isAuthentic: l.isAuthentic
    }));
  } catch (err) {
    console.warn("Failed to fetch verification logs from blockchain:", err.message);
    return [];
  }
}

// POST /api/verify/document - Multi-Layer Verification by uploading file
router.post("/document", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }
    if (!proofChainContract) {
      return res.status(503).json({ success: false, error: "Smart contract not deployed." });
    }

    // 1. Generate hashes
    const { hexHash, bytes32Hash } = hashService.generateDocumentHash(req.file.buffer);

    // Check Cache first
    const cacheKey = `verify:doc:${hexHash}`;
    const cachedResponse = await cacheService.get(cacheKey);
    if (cachedResponse) {
      return res.json({ ...cachedResponse, cached: true });
    }

    // 2. Perform AI Forgery Analysis on the uploaded file buffer
    const aiAnalysis = await forgeryDetector.analyzeDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // 3. Query Blockchain verification
    const recordLog = req.query.recordLog === "true" || req.body.recordLog === true;
    let isAuthentic = false;
    let doc = { exists: false };

    if (recordLog) {
      // Call transaction (modifies state to record log)
      console.log(`Writing verification audit trail for ${hexHash} on-chain...`);
      const tx = await proofChainContract.verifyDocument(bytes32Hash);
      const receipt = await tx.wait();
      console.log(`Audit log written in tx: ${receipt.hash}`);
      
      // Get the view details
      const [_auth, _doc] = await proofChainContract.verifyDocumentView(bytes32Hash);
      isAuthentic = _auth;
      doc = _doc;
    } else {
      // Direct view query (no gas fee)
      const [_auth, _doc] = await proofChainContract.verifyDocumentView(bytes32Hash);
      isAuthentic = _auth;
      doc = _doc;
    }

    // 4. Retrieve Verification History Trails
    const historyLogs = await getVerificationHistory(bytes32Hash);

    // 5. Aggregate Multi-Layer Trust Score
    // Weight Distribution:
    // Blockchain Integrity -> 50%
    // AI Forgery Clearance -> 50%
    let blockchainIntegrity = 0;
    let status = "NOT_FOUND";
    let message = "❌ Document NOT found on blockchain — may be forged or unregistered";

    if (isAuthentic) {
      blockchainIntegrity = 100;
      status = "AUTHENTIC";
      message = "✅ Document is authentic and verified on blockchain";
    } else if (doc.exists) {
      blockchainIntegrity = 0; // exists but is revoked
      status = "REVOKED";
      message = "⚠️ Document exists but has been revoked by the issuer";
    }

    // Calculate aggregated trust score
    const aiScore = aiAnalysis.confidenceScore; // 0 to 100
    let trustScore = Math.round((blockchainIntegrity * 0.5) + (aiScore * 0.5));
    
    // Revoked documents must have trust score 0
    if (status === "REVOKED") {
      trustScore = 0;
    }

    const responsePayload = {
      success: true,
      verified: isAuthentic,
      status,
      message,
      trustScore,
      breakdown: {
        blockchainIntegrity,
        aiConfidence: aiScore,
        metadataRisk: aiAnalysis.analyses.find(a => a.type === "metadata_analysis")?.riskScore || 0
      },
      aiAnalysis,
      historyLogs,
      data: doc.exists ? {
        documentHash: doc.documentHash,
        issuer: doc.issuer,
        owner: doc.owner,
        timestamp: Number(doc.timestamp),
        documentType: doc.documentType,
        issuerName: doc.issuerName,
        isRevoked: doc.isRevoked,
        ipfsHash: doc.ipfsHash,
        registeredAt: new Date(Number(doc.timestamp) * 1000).toISOString()
      } : { documentHash: hexHash }
    };

    // Cache results for 5 minutes
    await cacheService.set(cacheKey, responsePayload, 300);

    res.json(responsePayload);
  } catch (error) {
    console.error("Document verification error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/verify/hash - Verification by Hash lookup (with optional IPFS fetching for AI analysis)
router.post("/hash", async (req, res) => {
  try {
    const { hash } = req.body;
    if (!hash) {
      return res.status(400).json({ success: false, error: "Hash parameter required" });
    }
    if (!proofChainContract) {
      return res.status(503).json({ success: false, error: "Smart contract not deployed." });
    }

    const hexHash = hash.startsWith("0x") ? hash : "0x" + hash;
    const bytes32Hash = hexHash; // Kept consistent

    // Check Cache first
    const cacheKey = `verify:hash:${hexHash}`;
    const cachedResponse = await cacheService.get(cacheKey);
    if (cachedResponse) {
      return res.json({ ...cachedResponse, cached: true });
    }

    // 1. Verify on blockchain
    const [isAuthentic, doc] = await proofChainContract.verifyDocumentView(bytes32Hash);
    const historyLogs = await getVerificationHistory(bytes32Hash);

    let status = "NOT_FOUND";
    let message = "❌ Document NOT found on blockchain — may be forged or unregistered";
    let blockchainIntegrity = 0;

    if (isAuthentic) {
      blockchainIntegrity = 100;
      status = "AUTHENTIC";
      message = "✅ Document is authentic and verified on blockchain";
    } else if (doc.exists) {
      blockchainIntegrity = 0;
      status = "REVOKED";
      message = "⚠️ Document exists but has been revoked by the issuer";
    }

    let aiAnalysis = null;
    let aiScore = 100; // Default clean if no document content is scanned

    // 2. Cohesive IPFS pull: If authentic on-chain, retrieve original file from IPFS
    // and execute the AI Forgery Detector on it dynamically!
    if (doc.exists && doc.ipfsHash && doc.ipfsHash.startsWith("Qm")) {
      try {
        console.log(`Pulling file from mock IPFS (CID: ${doc.ipfsHash}) for visual AI audit...`);
        const fileData = await ipfsService.cat(doc.ipfsHash);
        
        // Run AI analysis
        aiAnalysis = await forgeryDetector.analyzeDocument(
          fileData.data,
          fileData.filename,
          fileData.filename.endsWith(".pdf") ? "application/pdf" : "image/jpeg"
        );
        aiScore = aiAnalysis.confidenceScore;
      } catch (ipfsError) {
        console.warn(`Failed to fetch/analyze IPFS attachment for hash ${hexHash}:`, ipfsError.message);
        // Fail gracefully, keep default clean or set to unverified/medium
        aiScore = 70; 
      }
    }

    let trustScore = Math.round((blockchainIntegrity * 0.5) + (aiScore * 0.5));
    if (status === "REVOKED") {
      trustScore = 0;
    }

    const responsePayload = {
      success: true,
      verified: isAuthentic,
      status,
      message,
      trustScore,
      breakdown: {
        blockchainIntegrity,
        aiConfidence: aiScore,
        metadataRisk: aiAnalysis ? (aiAnalysis.analyses.find(a => a.type === "metadata_analysis")?.riskScore || 0) : 0
      },
      aiAnalysis,
      historyLogs,
      data: doc.exists ? {
        documentHash: doc.documentHash,
        issuer: doc.issuer,
        owner: doc.owner,
        timestamp: Number(doc.timestamp),
        documentType: doc.documentType,
        issuerName: doc.issuerName,
        isRevoked: doc.isRevoked,
        ipfsHash: doc.ipfsHash,
        registeredAt: new Date(Number(doc.timestamp) * 1000).toISOString()
      } : { documentHash: hexHash }
    };

    // Cache the hash verify response
    await cacheService.set(cacheKey, responsePayload, 300);

    res.json(responsePayload);
  } catch (error) {
    console.error("Hash verification error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
