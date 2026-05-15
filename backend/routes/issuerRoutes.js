const express = require("express");
const router = express.Router();
const { proofChainContract } = require("../services/blockchain");

// POST /api/issuers/register
router.post("/register", async (req, res) => {
  try {
    const { issuerAddress, name, category, website } = req.body;
    if (!issuerAddress || !name || !category) {
      return res.status(400).json({ success: false, error: "issuerAddress, name, and category required" });
    }
    if (!proofChainContract) {
      return res.status(503).json({ success: false, error: "Contract not deployed" });
    }
    const tx = await proofChainContract.registerIssuer(issuerAddress, name, category, website || "");
    const receipt = await tx.wait();
    res.json({ success: true, transactionHash: receipt.hash });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/issuers/:address
router.get("/:address", async (req, res) => {
  try {
    if (!proofChainContract) {
      return res.status(503).json({ success: false, error: "Contract not deployed" });
    }
    const issuer = await proofChainContract.getIssuer(req.params.address);
    res.json({
      success: true,
      data: {
        name: issuer.name,
        category: issuer.category,
        website: issuer.website,
        isActive: issuer.isActive,
        registeredAt: Number(issuer.registeredAt),
        documentsIssued: Number(issuer.documentsIssued),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/issuers/check/:address
router.get("/check/:address", async (req, res) => {
  try {
    if (!proofChainContract) {
      return res.status(503).json({ success: false, error: "Contract not deployed" });
    }
    const isActive = await proofChainContract.isActiveIssuer(req.params.address);
    res.json({ success: true, isActive });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
