const express = require("express");
const router = express.Router();
const multer = require("multer");
const forgeryDetector = require("../ai/forgeryDetector");
const plagiarismDetector = require("../ai/plagiarismDetector");
const aiContentDetector = require("../ai/aiContentDetector");
const ocrNerService = require("../ai/ocrNerService");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/ai/analyze-forgery - Visual forgery analysis
router.post("/analyze-forgery", upload.single("document"), async (req, res) => {
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/analyze-text - Full text analysis (Plagiarism + AI Detection + OCR)
router.post("/analyze-text", async (req, res) => {
  try {
    const { text, docId, title } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: "Text is required" });
    }

    // 1. Plagiarism Check
    const plagiarismReport = await plagiarismDetector.analyseText(text, docId, title);

    // 2. AI Content Check
    const aiReport = await aiContentDetector.analyse(text);

    // 3. OCR/NER Entity Extraction
    const entities = ocrNerService.extractEntities(text);

    res.json({
      success: true,
      data: {
        plagiarism: plagiarismReport,
        aiDetection: aiReport,
        entities: entities
      }
    });
  } catch (error) {
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
