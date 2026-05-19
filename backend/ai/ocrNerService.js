/**
 * OCR & NER Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses basic text extraction and simple regex/heuristics to emulate OCR+NER
 * without requiring heavy external dependencies (Tesseract/SpaCy) for this demo.
 * 
 * In a real-world scenario, you would use:
 * - Tesseract.js for image-to-text
 * - Compromise.js or a local Python API (SpaCy) for NER
 */

class OcrNerService {
  /**
   * Extract entities from raw text.
   * Emulates Named Entity Recognition (NER).
   */
  extractEntities(text) {
    if (!text) return { names: [], dates: [], organizations: [] };

    // Basic heuristic patterns for demonstration
    const dateRegex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}, \d{4}\b|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi;
    const orgRegex = /\b[A-Z][a-z]+ (University|College|Institute|Academy|School|Corporation|Inc|LLC|Ltd)\b/g;
    
    // Very naive Name detection: two capitalized words not at start of sentence (hard to do cleanly in regex, just approximating)
    const nameRegex = /(?<!^|\.\s+)\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;

    const dates = [...new Set(text.match(dateRegex) || [])];
    const organizations = [...new Set(text.match(orgRegex) || [])];
    
    // Filter out orgs from names to be safe
    let rawNames = [...new Set(text.match(nameRegex) || [])];
    const names = rawNames.filter(n => !organizations.some(o => o.includes(n)));

    return {
      names: names.slice(0, 5),
      dates: dates.slice(0, 5),
      organizations: organizations.slice(0, 5),
    };
  }

  /**
   * Compare extracted entities against expected metadata.
   */
  verifyMetadata(extractedEntities, expectedMetadata) {
    const { expectedName, expectedDate, expectedIssuer } = expectedMetadata;
    const results = {
      nameMatch: false,
      dateMatch: false,
      issuerMatch: false,
      overallMatch: false,
      details: []
    };

    if (expectedName) {
      const match = extractedEntities.names.some(n => n.toLowerCase().includes(expectedName.toLowerCase()));
      results.nameMatch = match;
      if (!match) results.details.push(`Expected name '${expectedName}' not found in document text.`);
    }

    if (expectedIssuer) {
      const match = extractedEntities.organizations.some(o => o.toLowerCase().includes(expectedIssuer.toLowerCase()));
      results.issuerMatch = match;
      if (!match) results.details.push(`Expected issuer '${expectedIssuer}' not found in document text.`);
    }

    // Simple overall boolean
    results.overallMatch = (results.nameMatch || !expectedName) && (results.issuerMatch || !expectedIssuer);

    return results;
  }
}

module.exports = new OcrNerService();
