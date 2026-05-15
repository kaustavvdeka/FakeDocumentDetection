const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const documentRoutes = require("./routes/documentRoutes");
const verifyRoutes = require("./routes/verifyRoutes");
const issuerRoutes = require("./routes/issuerRoutes");
const aiRoutes = require("./routes/aiRoutes");
const statsRoutes = require("./routes/statsRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static files for uploaded documents
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/documents", documentRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/issuers", issuerRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/stats", statsRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`\n🔗 ProofChain Backend running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
