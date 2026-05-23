const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const hashService = require("../services/hashService");
const ipfsService = require("../services/ipfsService");
const cacheService = require("../services/cacheService");
const { proofChainContract, signer } = require("../services/blockchain");

// Configure multer for temp file uploads prior to IPFS push
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

// GET /api/documents/ipfs/:cid - Download and decrypt document from IPFS
router.get("/ipfs/:cid", async (req, res) => {
  try {
    const { cid } = req.params;
    
    // Check cache first
    const cacheKey = `ipfs:file:${cid}`;
    const cachedFile = await cacheService.get(cacheKey);
    
    let fileData;
    if (cachedFile) {
      fileData = {
        data: Buffer.from(cachedFile.base64Data, "base64"),
        filename: cachedFile.filename,
        uploadedAt: cachedFile.uploadedAt
      };
    } else {
      fileData = await ipfsService.cat(cid);
      // Cache base64 serialized data
      await cacheService.set(cacheKey, {
        base64Data: fileData.data.toString("base64"),
        filename: fileData.filename,
        uploadedAt: fileData.uploadedAt
      }, 600); // cache for 10 mins
    }

    res.setHeader("Content-Disposition", `attachment; filename="${fileData.filename}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(fileData.data);
  } catch (error) {
    console.error("IPFS retrieval error:", error);
    res.status(404).json({ success: false, error: error.message });
  }
});

// POST /api/documents/register - Register a document on blockchain & IPFS
router.post("/register", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const { ownerAddress, documentType } = req.body;
    if (!ownerAddress || !documentType) {
      return res.status(400).json({ success: false, error: "ownerAddress and documentType are required" });
    }

    // Read temp file and generate hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const { hexHash, bytes32Hash } = hashService.generateDocumentHash(fileBuffer);

    // 1. Upload to IPFS (which encrypts it and performs malware check)
    const ipfsResult = await ipfsService.upload(fileBuffer, req.file.originalname);
    const ipfsHash = ipfsResult.cid;

    if (!proofChainContract) {
      return res.status(503).json({ success: false, error: "Smart contract not deployed. Run deployment first." });
    }

    // 2. Register on blockchain
    console.log(`Registering document ${hexHash} on-chain with IPFS CID ${ipfsHash}...`);
    const tx = await proofChainContract.registerDocument(
      bytes32Hash,
      ownerAddress,
      ipfsHash,
      documentType
    );
    const receipt = await tx.wait();

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    // Clear stats cache so it updates
    await cacheService.del("platform:stats");

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
    // Cleanup file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/documents/register-batch - Register a batch of documents (Gas-Optimized Batch Call)
router.post("/register-batch", upload.array("documents", 10), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: "No files uploaded" });
    }

    const { owners, documentTypes } = req.body;
    if (!owners || !documentTypes) {
      return res.status(400).json({ success: false, error: "owners and documentTypes arrays/comma-separated strings required" });
    }

    const ownersArray = typeof owners === 'string' ? owners.split(',') : owners;
    const typesArray = typeof documentTypes === 'string' ? documentTypes.split(',') : documentTypes;

    if (files.length !== ownersArray.length || files.length !== typesArray.length) {
      return res.status(400).json({ 
        success: false, 
        error: `Input lengths mismatch. Received: ${files.length} files, ${ownersArray.length} owners, ${typesArray.length} document types.` 
      });
    }

    const hashes = [];
    const ipfsHashes = [];
    const hexHashes = [];

    // 1. Process files: encrypt & upload to mock IPFS
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileBuffer = fs.readFileSync(file.path);
      
      const { hexHash, bytes32Hash } = hashService.generateDocumentHash(fileBuffer);
      hashes.push(bytes32Hash);
      hexHashes.push(hexHash);

      const ipfsResult = await ipfsService.upload(fileBuffer, file.originalname);
      ipfsHashes.push(ipfsResult.cid);

      // Clean up temp file
      fs.unlinkSync(file.path);
    }

    if (!proofChainContract) {
      return res.status(503).json({ success: false, error: "Smart contract not deployed." });
    }

    // 2. Register on-chain in one batch transaction
    console.log(`Registering batch of ${files.length} documents on-chain...`);
    const tx = await proofChainContract.registerDocumentsBatch(
      hashes,
      ownersArray.map(addr => addr.trim()),
      ipfsHashes,
      typesArray.map(t => t.trim())
    );
    const receipt = await tx.wait();

    // Clear stats cache
    await cacheService.del("platform:stats");

    res.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      registeredCount: files.length,
      documents: hexHashes.map((hash, idx) => ({
        documentHash: hash,
        ipfsHash: ipfsHashes[idx],
        owner: ownersArray[idx],
        type: typesArray[idx],
        fileName: files[idx].originalname
      }))
    });
  } catch (error) {
    console.error("Batch register error:", error);
    // Clean up any remaining temp files
    if (req.files) {
      req.files.forEach(f => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/documents/:hash - Get document details
router.get("/:hash", async (req, res) => {
  try {
    const hash = req.params.hash.startsWith("0x") ? req.params.hash : "0x" + req.params.hash;
    
    // Check Cache first
    const cacheKey = `document:info:${hash}`;
    const cachedDoc = await cacheService.get(cacheKey);
    if (cachedDoc) {
      return res.json({ success: true, data: cachedDoc, cached: true });
    }

    if (!proofChainContract) {
      return res.status(503).json({ success: false, error: "Contract not deployed" });
    }
    const doc = await proofChainContract.getDocument(hash);
    
    const docDetails = {
      documentHash: doc.documentHash,
      issuer: doc.issuer,
      owner: doc.owner,
      timestamp: Number(doc.timestamp),
      ipfsHash: doc.ipfsHash,
      documentType: doc.documentType,
      issuerName: doc.issuerName,
      isRevoked: doc.isRevoked,
    };

    // Cache the document details
    await cacheService.set(cacheKey, docDetails, 300);

    res.json({
      success: true,
      data: docDetails,
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
          ipfsHash: doc.ipfsHash,
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

    // Clear caches
    await cacheService.del(`document:info:${hash}`);
    await cacheService.del(`verify:hash:${hash}`);
    await cacheService.del("platform:stats");

    res.json({ success: true, transactionHash: receipt.hash });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
