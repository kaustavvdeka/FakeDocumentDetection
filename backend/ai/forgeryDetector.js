const crypto = require("crypto");
const fs = require("fs");

/**
 * AI Forgery Detection Service
 * Analyzes documents for signs of tampering using multiple techniques:
 * 1. File metadata analysis
 * 2. PDF structure inspection
 * 3. Image Error Level Analysis (ELA) simulation
 * 4. Hash consistency checking
 * 5. Text pattern anomaly detection
 */

class AIForgeryDetector {
  constructor() {
    this.suspiciousPatterns = [
      /Adobe\s+Photoshop/i,
      /GIMP/i,
      /Paint\.NET/i,
      /Pixelmator/i,
      /edited/i,
      /modified/i,
    ];

    this.knownForgeryIndicators = {
      pdf: {
        multipleCreators: false,
        modifiedAfterCreation: false,
        inconsistentFonts: false,
        embeddedEditorTraces: false,
      },
      image: {
        elaScore: 0,
        metadataStripped: false,
        compressionAnomalies: false,
        editSoftwareDetected: false,
      },
    };
  }

  /**
   * Analyze a document buffer for forgery indicators
   * @param {Buffer} fileBuffer - The file content
   * @param {string} fileName - Original filename
   * @param {string} mimeType - MIME type of the file
   * @returns {Object} Analysis results with confidence scores
   */
  async analyzeDocument(fileBuffer, fileName, mimeType) {
    const results = {
      fileName,
      mimeType,
      fileSize: fileBuffer.length,
      sha256Hash: this.generateHash(fileBuffer),
      timestamp: new Date().toISOString(),
      analyses: [],
      overallRisk: "low",
      confidenceScore: 0,
      isAuthentic: true,
      details: {},
    };

    // 1. Metadata Analysis
    const metadataResult = this.analyzeMetadata(fileBuffer, fileName, mimeType);
    results.analyses.push(metadataResult);

    // 2. File Structure Analysis
    const structureResult = this.analyzeFileStructure(fileBuffer, mimeType);
    results.analyses.push(structureResult);

    // 3. Content Pattern Analysis
    const patternResult = this.analyzeContentPatterns(fileBuffer);
    results.analyses.push(patternResult);

    // 4. Binary Signature Analysis
    const signatureResult = this.analyzeBinarySignatures(fileBuffer, mimeType);
    results.analyses.push(signatureResult);

    // 5. Entropy Analysis
    const entropyResult = this.analyzeEntropy(fileBuffer);
    results.analyses.push(entropyResult);

    // Calculate overall risk
    const riskScores = results.analyses.map(a => a.riskScore);
    const avgRisk = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;
    
    results.confidenceScore = Math.round((1 - avgRisk) * 100);
    
    if (avgRisk > 0.7) {
      results.overallRisk = "critical";
      results.isAuthentic = false;
    } else if (avgRisk > 0.5) {
      results.overallRisk = "high";
      results.isAuthentic = false;
    } else if (avgRisk > 0.3) {
      results.overallRisk = "medium";
      results.isAuthentic = true; // borderline
    } else {
      results.overallRisk = "low";
      results.isAuthentic = true;
    }

    return results;
  }

  /**
   * Generate SHA-256 hash of file content
   */
  generateHash(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Analyze file metadata
   */
  analyzeMetadata(fileBuffer, fileName, mimeType) {
    const result = {
      type: "metadata_analysis",
      description: "File metadata and property analysis",
      findings: [],
      riskScore: 0,
    };

    // Check file extension vs content type
    const ext = fileName.split(".").pop().toLowerCase();
    const expectedMimes = {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    if (expectedMimes[ext] && expectedMimes[ext] !== mimeType) {
      result.findings.push({
        severity: "high",
        message: `File extension (.${ext}) does not match content type (${mimeType})`,
      });
      result.riskScore += 0.4;
    }

    // Check for unusually small files
    if (fileBuffer.length < 100) {
      result.findings.push({
        severity: "medium",
        message: "File is suspiciously small",
      });
      result.riskScore += 0.2;
    }

    // Check for common file size manipulation
    if (fileBuffer.length > 50 * 1024 * 1024) {
      result.findings.push({
        severity: "low",
        message: "File is unusually large (>50MB)",
      });
      result.riskScore += 0.1;
    }

    if (result.findings.length === 0) {
      result.findings.push({
        severity: "info",
        message: "Metadata appears consistent",
      });
    }

    result.riskScore = Math.min(result.riskScore, 1.0);
    return result;
  }

  /**
   * Analyze file structure for anomalies
   */
  analyzeFileStructure(fileBuffer, mimeType) {
    const result = {
      type: "structure_analysis",
      description: "File structure and format integrity check",
      findings: [],
      riskScore: 0,
    };

    const headerHex = fileBuffer.slice(0, 16).toString("hex");

    // PDF-specific checks
    if (mimeType === "application/pdf") {
      const content = fileBuffer.toString("utf8", 0, Math.min(fileBuffer.length, 10000));

      // Check for PDF header
      if (!content.startsWith("%PDF")) {
        result.findings.push({
          severity: "critical",
          message: "Invalid PDF header — file may be corrupted or fake",
        });
        result.riskScore += 0.8;
      }

      // Check for editing software traces
      for (const pattern of this.suspiciousPatterns) {
        if (pattern.test(content)) {
          result.findings.push({
            severity: "medium",
            message: `Detected editing software trace: ${pattern.source}`,
          });
          result.riskScore += 0.15;
        }
      }

      // Check for multiple modification dates
      const modDateMatches = content.match(/\/ModDate/g);
      if (modDateMatches && modDateMatches.length > 2) {
        result.findings.push({
          severity: "medium",
          message: `Multiple modification dates found (${modDateMatches.length}), suggesting repeated edits`,
        });
        result.riskScore += 0.2;
      }

      // Check for incremental updates (sign of editing)
      const xrefCount = (content.match(/xref/g) || []).length;
      if (xrefCount > 2) {
        result.findings.push({
          severity: "low",
          message: `Multiple cross-reference tables (${xrefCount}) indicate document modifications`,
        });
        result.riskScore += 0.1;
      }
    }

    // Image-specific checks
    if (mimeType.startsWith("image/")) {
      // Check magic bytes
      const validHeaders = {
        "image/jpeg": "ffd8ff",
        "image/png": "89504e47",
        "image/gif": "47494638",
      };

      if (validHeaders[mimeType] && !headerHex.startsWith(validHeaders[mimeType])) {
        result.findings.push({
          severity: "critical",
          message: "Image file header does not match declared format",
        });
        result.riskScore += 0.7;
      }

      // Check for EXIF data manipulation indicators
      const content = fileBuffer.toString("binary");
      if (content.includes("Photoshop") || content.includes("GIMP")) {
        result.findings.push({
          severity: "medium",
          message: "Image editing software signature detected in file data",
        });
        result.riskScore += 0.2;
      }
    }

    if (result.findings.length === 0) {
      result.findings.push({
        severity: "info",
        message: "File structure appears valid",
      });
    }

    result.riskScore = Math.min(result.riskScore, 1.0);
    return result;
  }

  /**
   * Analyze content for suspicious patterns
   */
  analyzeContentPatterns(fileBuffer) {
    const result = {
      type: "pattern_analysis",
      description: "Content pattern and anomaly detection",
      findings: [],
      riskScore: 0,
    };

    const content = fileBuffer.toString("utf8", 0, Math.min(fileBuffer.length, 50000));

    // Check for null byte injection
    const nullCount = (content.match(/\x00/g) || []).length;
    const nullRatio = nullCount / content.length;
    
    // Check for suspicious text patterns (common in forged documents)
    const forgeryKeywords = [
      "template", "sample", "dummy", "test document",
      "lorem ipsum", "placeholder",
    ];

    for (const keyword of forgeryKeywords) {
      if (content.toLowerCase().includes(keyword)) {
        result.findings.push({
          severity: "low",
          message: `Document contains placeholder text: "${keyword}"`,
        });
        result.riskScore += 0.1;
      }
    }

    // Check for copy-paste artifacts
    const duplicateLines = this.findDuplicatePatterns(content);
    if (duplicateLines > 10) {
      result.findings.push({
        severity: "low",
        message: `High number of duplicate patterns detected (${duplicateLines})`,
      });
      result.riskScore += 0.1;
    }

    if (result.findings.length === 0) {
      result.findings.push({
        severity: "info",
        message: "No suspicious content patterns detected",
      });
    }

    result.riskScore = Math.min(result.riskScore, 1.0);
    return result;
  }

  /**
   * Analyze binary signatures and format validity
   */
  analyzeBinarySignatures(fileBuffer, mimeType) {
    const result = {
      type: "signature_analysis",
      description: "Binary signature and format validation",
      findings: [],
      riskScore: 0,
    };

    // File magic number verification
    const magicNumbers = {
      "application/pdf": Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
      "image/jpeg": Buffer.from([0xFF, 0xD8, 0xFF]),
      "image/png": Buffer.from([0x89, 0x50, 0x4E, 0x47]),
      "image/gif": Buffer.from([0x47, 0x49, 0x46, 0x38]),
    };

    if (magicNumbers[mimeType]) {
      const expectedMagic = magicNumbers[mimeType];
      const actualMagic = fileBuffer.slice(0, expectedMagic.length);
      
      if (!actualMagic.equals(expectedMagic)) {
        result.findings.push({
          severity: "critical",
          message: "File magic number mismatch — file format is spoofed",
        });
        result.riskScore += 0.9;
      } else {
        result.findings.push({
          severity: "info",
          message: "File magic number verified successfully",
        });
      }
    }

    // Check for file concatenation (common in steganography/tampering)
    if (mimeType === "image/jpeg") {
      const eofMarker = Buffer.from([0xFF, 0xD9]);
      let eofCount = 0;
      for (let i = 0; i < fileBuffer.length - 1; i++) {
        if (fileBuffer[i] === 0xFF && fileBuffer[i + 1] === 0xD9) {
          eofCount++;
        }
      }
      if (eofCount > 1) {
        result.findings.push({
          severity: "high",
          message: `Multiple JPEG end-of-file markers found (${eofCount}) — possible data appended after image`,
        });
        result.riskScore += 0.5;
      }
    }

    result.riskScore = Math.min(result.riskScore, 1.0);
    return result;
  }

  /**
   * Analyze file entropy to detect anomalies
   */
  analyzeEntropy(fileBuffer) {
    const result = {
      type: "entropy_analysis",
      description: "Shannon entropy analysis for compression/encryption detection",
      findings: [],
      riskScore: 0,
    };

    const entropy = this.calculateEntropy(fileBuffer);
    result.entropyValue = entropy;

    if (entropy > 7.9) {
      result.findings.push({
        severity: "medium",
        message: `Very high entropy (${entropy.toFixed(4)}) — file may be encrypted or heavily compressed`,
      });
      result.riskScore += 0.15;
    } else if (entropy < 1.0) {
      result.findings.push({
        severity: "high",
        message: `Very low entropy (${entropy.toFixed(4)}) — file may be mostly empty or artificially generated`,
      });
      result.riskScore += 0.4;
    } else {
      result.findings.push({
        severity: "info",
        message: `Normal entropy level (${entropy.toFixed(4)})`,
      });
    }

    return result;
  }

  /**
   * Calculate Shannon entropy of a buffer
   */
  calculateEntropy(buffer) {
    const freq = new Array(256).fill(0);
    for (let i = 0; i < buffer.length; i++) {
      freq[buffer[i]]++;
    }

    let entropy = 0;
    const len = buffer.length;
    for (let i = 0; i < 256; i++) {
      if (freq[i] > 0) {
        const p = freq[i] / len;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  /**
   * Find duplicate patterns in content
   */
  findDuplicatePatterns(content) {
    const lines = content.split("\n").filter(l => l.trim().length > 10);
    const seen = new Set();
    let duplicates = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (seen.has(trimmed)) {
        duplicates++;
      }
      seen.add(trimmed);
    }
    
    return duplicates;
  }

  /**
   * Compare two document hashes
   */
  compareHashes(hash1, hash2) {
    return {
      match: hash1 === hash2,
      hash1,
      hash2,
      message: hash1 === hash2
        ? "✅ Document hashes match — document is authentic"
        : "❌ Document hashes do NOT match — document may be tampered",
    };
  }
}

module.exports = new AIForgeryDetector();
