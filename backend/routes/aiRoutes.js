const express = require("express");
const router = express.Router();
const multer = require("multer");
const forgeryDetector = require("../ai/forgeryDetector");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/ai/analyze - AI forgery analysis
router.post("/analyze", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }
    const results = await forgeryDetector.analyzeDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    res.json({ success: true, data: results });
  } catch (error) {
    console.error("AI analysis error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/compare - Compare two document hashes
router.post("/compare", async (req, res) => {
  try {
    const { hash1, hash2 } = req.body;
    if (!hash1 || !hash2) {
      return res.status(400).json({ success: false, error: "Both hash1 and hash2 required" });
    }
    const result = forgeryDetector.compareHashes(hash1, hash2);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
