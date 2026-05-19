/**
 * Plagiarism Detector
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements three layers of plagiarism detection — all running locally,
 * zero external API calls required:
 *
 *  1. TF-IDF Cosine Similarity  — catches direct copy-paste
 *  2. N-gram Fingerprinting     — catches near-exact paraphrasing
 *  3. Sentence-Hashing (Shingling) — catches reordering / sentence shuffling
 *
 * In a production system you would add a FAISS/vector DB with pre-loaded
 * embeddings. Here we maintain an in-memory corpus that grows as documents
 * are submitted (persisted to disk on shutdown).
 */

const crypto = require("crypto");
const fs     = require("fs");
const path   = require("path");

// ─── Stop-word list (English) ─────────────────────────────────────────────────
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","being","have","has",
  "had","do","does","did","will","would","could","should","may","might",
  "shall","can","need","dare","ought","used","it","its","this","that",
  "these","those","i","you","he","she","we","they","me","him","her","us",
  "them","my","your","his","our","their","what","which","who","whom",
  "when","where","why","how","all","each","every","both","few","more",
  "most","other","some","such","no","not","only","same","so","than","too",
  "very","just","because","as","until","while","although","though","since",
  "unless","if","then","than","also","into","over","after","before","above",
  "below","between","through","during","around",
]);

const CORPUS_PATH = path.join(__dirname, "..", "data", "plagiarism_corpus.json");

class PlagiarismDetector {
  constructor() {
    this.corpus = [];      // [{ id, title, tokens, ngrams, shingles, rawText }]
    this._loadCorpus();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analyse a text document for plagiarism against the in-memory corpus.
   * @param {string} text  — raw text extracted from the document
   * @param {string} docId — unique identifier for this submission
   * @param {string} title — optional label shown in results
   * @returns {PlagiarismReport}
   */
  async analyseText(text, docId = null, title = "Submitted Document") {
    const tokens   = this._tokenize(text);
    const ngrams   = this._buildNgrams(tokens, 5);     // 5-grams
    const shingles = this._buildShingles(text, 9);     // 9-word shingles

    const matches = [];

    for (const entry of this.corpus) {
      if (entry.id === docId) continue;                // skip self

      // ① TF-IDF cosine similarity
      const cosine = this._cosineSimilarity(
        this._tfidfVector(tokens, this.corpus),
        this._tfidfVector(entry.tokens, this.corpus)
      );

      // ② N-gram Jaccard overlap
      const ngJaccard = this._jaccardSimilarity(ngrams, entry.ngrams);

      // ③ Shingle Jaccard (MinHash approximation)
      const shJaccard = this._jaccardSimilarity(shingles, entry.shingles);

      // Combined weighted score (tuned weights)
      const combined = cosine * 0.4 + ngJaccard * 0.35 + shJaccard * 0.25;

      if (combined > 0.08) {   // only surfaces meaningful matches
        // Find matching sentences for highlighting
        const matchingSentences = this._findMatchingSentences(text, entry.rawText);

        matches.push({
          sourceId:    entry.id,
          sourceTitle: entry.title,
          cosine:      Math.round(cosine   * 100),
          ngramScore:  Math.round(ngJaccard * 100),
          shingleScore:Math.round(shJaccard * 100),
          combined:    Math.round(combined  * 100),
          matchingSentences,
        });
      }
    }

    // Sort by highest similarity first
    matches.sort((a, b) => b.combined - a.combined);
    const topMatch = matches[0] || null;

    // Plagiarism level based on highest combined score
    const overallScore = topMatch ? topMatch.combined : 0;
    const level =
      overallScore > 70 ? "CRITICAL" :
      overallScore > 40 ? "HIGH"     :
      overallScore > 20 ? "MEDIUM"   :
      overallScore > 8  ? "LOW"      : "NONE";

    // Add to corpus for future checks (after analysis to avoid self-match)
    if (docId) {
      this._addToCorpus({ id: docId, title, tokens, ngrams, shingles, rawText: text });
    }

    return {
      docId,
      title,
      overallScore,
      level,
      isPlagiarised: overallScore > 20,
      totalSourcesChecked: this.corpus.length,
      matches: matches.slice(0, 5),   // top-5 matches
      wordCount: tokens.length,
      uniquenessScore: 100 - overallScore,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add a reference document to the corpus (e.g. previously registered papers).
   */
  addReferenceDocument(id, title, text) {
    const tokens   = this._tokenize(text);
    const ngrams   = this._buildNgrams(tokens, 5);
    const shingles = this._buildShingles(text, 9);
    this._addToCorpus({ id, title, tokens, ngrams, shingles, rawText: text });
  }

  /**
   * Get corpus statistics.
   */
  getCorpusStats() {
    return {
      totalDocuments: this.corpus.length,
      corpusPath: CORPUS_PATH,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  _tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(t => t.length > 2 && !STOP_WORDS.has(t));
  }

  _buildNgrams(tokens, n) {
    const ngrams = new Set();
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.add(tokens.slice(i, i + n).join(" "));
    }
    return ngrams;
  }

  _buildShingles(text, w) {
    const words    = text.toLowerCase().split(/\s+/);
    const shingles = new Set();
    for (let i = 0; i <= words.length - w; i++) {
      const shingle = words.slice(i, i + w).join(" ");
      // Store as MD5 hash to save memory
      shingles.add(crypto.createHash("md5").update(shingle).digest("hex").slice(0, 8));
    }
    return shingles;
  }

  _jaccardSimilarity(setA, setB) {
    if (setA.size === 0 && setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    return intersection / (setA.size + setB.size - intersection);
  }

  _termFrequency(tokens) {
    const tf = {};
    for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
    const max = Math.max(...Object.values(tf));
    for (const t in tf) tf[t] /= max;
    return tf;
  }

  _tfidfVector(tokens, corpus) {
    const tf  = this._termFrequency(tokens);
    const N   = corpus.length + 1;
    const vec = {};
    for (const term in tf) {
      const docsWithTerm = corpus.filter(d => d.tokens.includes(term)).length + 1;
      const idf = Math.log(N / docsWithTerm);
      vec[term] = tf[term] * idf;
    }
    return vec;
  }

  _cosineSimilarity(vecA, vecB) {
    const allTerms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    let dot = 0, magA = 0, magB = 0;
    for (const t of allTerms) {
      const a = vecA[t] || 0;
      const b = vecB[t] || 0;
      dot  += a * b;
      magA += a * a;
      magB += b * b;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  _findMatchingSentences(textA, textB) {
    const sentA = textA.match(/[^.!?]+[.!?]+/g) || [];
    const sentB = new Set((textB.match(/[^.!?]+[.!?]+/g) || []).map(s => s.trim().toLowerCase()));
    return sentA
      .filter(s => sentB.has(s.trim().toLowerCase()))
      .slice(0, 3)
      .map(s => s.trim());
  }

  _addToCorpus(entry) {
    // Avoid duplicates
    if (this.corpus.find(c => c.id === entry.id)) return;
    this.corpus.push(entry);
    this._saveCorpus();
  }

  _loadCorpus() {
    try {
      const dir = path.dirname(CORPUS_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(CORPUS_PATH)) {
        const raw = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8"));
        // Reconstruct Sets from arrays
        this.corpus = raw.map(e => ({
          ...e,
          ngrams:   new Set(e.ngrams),
          shingles: new Set(e.shingles),
        }));
        console.log(`[Plagiarism] Loaded ${this.corpus.length} reference documents.`);
      }
    } catch { this.corpus = []; }
  }

  _saveCorpus() {
    try {
      const serializable = this.corpus.map(e => ({
        ...e,
        ngrams:   [...e.ngrams],
        shingles: [...e.shingles],
      }));
      fs.writeFileSync(CORPUS_PATH, JSON.stringify(serializable));
    } catch (err) {
      console.warn("[Plagiarism] Could not save corpus:", err.message);
    }
  }
}

module.exports = new PlagiarismDetector();
