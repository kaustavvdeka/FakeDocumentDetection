const express = require("express");
const router = express.Router();
const { proofChainContract } = require("../services/blockchain");

// GET /api/stats - Get platform statistics
router.get("/", async (req, res) => {
  try {
    if (!proofChainContract) {
      return res.json({
        success: true,
        data: { totalDocuments: 0, totalIssuers: 0, totalVerifications: 0 },
      });
    }
    const [totalDocuments, totalIssuers, totalVerifications] = await proofChainContract.getStats();
    res.json({
      success: true,
      data: {
        totalDocuments: Number(totalDocuments),
        totalIssuers: Number(totalIssuers),
        totalVerifications: Number(totalVerifications),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
