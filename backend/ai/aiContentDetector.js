/**
 * AI Content Detector
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects whether text was written by an AI (ChatGPT, Gemini, Claude, etc.)
 * or by a human — including text that has been "humanised" by tools like
 * QuillBot / StealthWriter.
 */

const COMMON_AI_PHRASES = [
  "it is important to note",
  "in conclusion",
  "furthermore",
  "moreover",
  "it is worth noting",
  "in summary",
  "to summarize",
  "as mentioned earlier",
  "it is crucial",
  "in today's world",
  "in the realm of",
  "delve into",
  "navigating the",
  "it is essential to",
  "it should be noted",
  "on the other hand",
  "when it comes to",
  "in terms of",
  "needless to say",
  "rest assured",
  "at the end of the day",
  "the landscape of",
  "as we can see",
  "in light of",
  "shed light on",
];

// Humaniser synonym pairs — QuillBot tends to swap these
const HUMANISER_SWAPS = [
  ["utilize", "use"], ["commence", "start"], ["acquire", "get"],
  ["endeavour", "try"], ["subsequent", "next"], ["prior to", "before"],
  ["in order to", "to"], ["ascertain", "find out"], ["facilitate", "help"],
  ["demonstrate", "show"], ["comprehend", "understand"], ["indicate", "show"],
  ["numerous", "many"], ["additional", "more"], ["significant", "important"],
];

class AIContentDetector {
  async analyse(text) {
    if (!text || text.trim().length < 50) {
      return this._insufficientText();
    }

    const sentences  = this._splitSentences(text);
    const words      = this._tokenizeWords(text);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);

    const features = {
      perplexityScore:    this._perplexityScore(sentences, words),
      burstinessScore:    this._burstinessScore(sentences),
      vocabularyRichness: this._vocabularyRichness(words),
      stylometricScore:   this._stylometricScore(text, words, sentences),
      aiPhraseScore:      this._aiPhraseScore(text),
      uniformityScore:    this._uniformityScore(sentences),
      humaniserScore:     this._humaniserScore(text),
    };

    const aiProbability = this._combineFeatures(features);
    const level = this._classifyLevel(aiProbability);

    return {
      aiProbability,
      humanProbability: 100 - aiProbability,
      level,
      isAIGenerated: aiProbability > 60,
      isHumanised:   features.humaniserScore > 40 && aiProbability > 40,
      features: {
        perplexity:    Math.round(features.perplexityScore),
        burstiness:    Math.round(features.burstinessScore),
        vocabulary:    Math.round(features.vocabularyRichness),
        stylometric:   Math.round(features.stylometricScore),
        aiPhrases:     Math.round(features.aiPhraseScore),
        uniformity:    Math.round(features.uniformityScore),
        humaniserMark: Math.round(features.humaniserScore),
      },
      statistics: {
        wordCount:         words.length,
        sentenceCount:     sentences.length,
        avgWordsPerSent:   Math.round(words.length / Math.max(sentences.length, 1)),
        avgWordLength:     (words.reduce((s, w) => s + w.length, 0) / Math.max(words.length, 1)).toFixed(2),
        uniqueWordRatio:   ((new Set(words).size / Math.max(words.length, 1)) * 100).toFixed(1) + "%",
        paragraphCount:    paragraphs.length,
      },
      flaggedPhrases: this._getFlaggedPhrases(text),
      humaniserTokens: this._getHumaniserTokens(text),
      timestamp: new Date().toISOString(),
    };
  }

  _perplexityScore(sentences, words) {
    if (words.length < 10) return 50;
    const bigrams = {};
    for (let i = 0; i < words.length - 1; i++) {
      const bg = `${words[i]} ${words[i+1]}`;
      bigrams[bg] = (bigrams[bg] || 0) + 1;
    }
    const uniqueBigrams = Object.keys(bigrams).length;
    const totalBigrams  = words.length - 1;
    const uniquenessRatio = uniqueBigrams / totalBigrams;
    return Math.max(0, Math.min(100, (1 - uniquenessRatio) * 80 + 10));
  }

  _burstinessScore(sentences) {
    if (sentences.length < 3) return 50;
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const mean    = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance= lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length;
    const stdDev  = Math.sqrt(variance);
    const cv      = stdDev / (mean || 1);
    const humanness = Math.min(cv / 0.6, 1);
    return Math.round((1 - humanness) * 100);
  }

  _vocabularyRichness(words) {
    if (words.length < 10) return 50;
    const unique = new Set(words);
    const ttr    = unique.size / words.length;
    const freq = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;
    const hapax      = Object.values(freq).filter(f => f === 1).length;
    const hapaxRatio = hapax / words.length;
    const richness = ttr * 0.6 + hapaxRatio * 0.4;
    return Math.round((1 - Math.min(richness * 2, 1)) * 100);
  }

  _stylometricScore(text, words, sentences) {
    const commas      = (text.match(/,/g) || []).length;
    const semicolons  = (text.match(/;/g) || []).length;
    const dashes      = (text.match(/[—–-]/g) || []).length;
    const exclamations= (text.match(/!/g) || []).length;
    const sentCount = sentences.length || 1;
    const punctRichness = (semicolons + dashes + exclamations) / sentCount;
    const avgWordLen = words.reduce((s, w) => s + w.length, 0) / Math.max(words.length, 1);
    const lenPenalty = avgWordLen > 5.5 ? (avgWordLen - 5.5) * 10 : 0;
    const aiSignal = lenPenalty + Math.max(0, 30 - punctRichness * 40);
    return Math.min(100, Math.max(0, aiSignal));
  }

  _aiPhraseScore(text) {
    const lower = text.toLowerCase();
    let hits = 0;
    const wordCount = text.split(/\s+/).length;
    for (const phrase of COMMON_AI_PHRASES) {
      if (lower.includes(phrase)) hits++;
    }
    const rate = (hits / Math.max(wordCount / 500, 1));
    return Math.min(100, rate * 30);
  }

  _uniformityScore(sentences) {
    if (sentences.length < 4) return 50;
    const vectorise = (sent) => {
      const words = sent.toLowerCase().split(/\s+/);
      const v = {};
      for (const w of words) v[w] = (v[w] || 0) + 1;
      return v;
    };
    const cosine = (a, b) => {
      const terms = new Set([...Object.keys(a), ...Object.keys(b)]);
      let dot = 0, magA = 0, magB = 0;
      for (const t of terms) {
        dot  += (a[t]||0) * (b[t]||0);
        magA += (a[t]||0) ** 2;
        magB += (b[t]||0) ** 2;
      }
      return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
    };
    let totalSim = 0, count = 0;
    for (let i = 0; i < sentences.length - 1; i++) {
      totalSim += cosine(vectorise(sentences[i]), vectorise(sentences[i+1]));
      count++;
    }
    const avgSim = totalSim / count;
    return Math.round(avgSim * 100);
  }

  _humaniserScore(text) {
    const lower = text.toLowerCase();
    let hits = 0;
    for (const [formal] of HUMANISER_SWAPS) {
      if (lower.includes(formal)) hits++;
    }
    return Math.min(100, hits * 8);
  }

  _combineFeatures(f) {
    const weighted =
      f.perplexityScore  * 0.20 +
      f.burstinessScore  * 0.25 +
      f.vocabularyRichness * 0.15 +
      f.stylometricScore * 0.15 +
      f.aiPhraseScore    * 0.10 +
      f.uniformityScore  * 0.10 +
      f.humaniserScore   * 0.05;
    return Math.round(Math.min(100, Math.max(0, weighted)));
  }

  _classifyLevel(prob) {
    if (prob < 20) return "HUMAN";
    if (prob < 40) return "LIKELY_HUMAN";
    if (prob < 60) return "UNCERTAIN";
    if (prob < 80) return "LIKELY_AI";
    return "AI";
  }

  _splitSentences(text) {
    return (text.match(/[^.!?]+[.!?]+/g) || [text]).map(s => s.trim()).filter(Boolean);
  }

  _tokenizeWords(text) {
    return text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(w => w.length > 1);
  }

  _getFlaggedPhrases(text) {
    const lower = text.toLowerCase();
    return COMMON_AI_PHRASES.filter(p => lower.includes(p)).slice(0, 8);
  }

  _getHumaniserTokens(text) {
    const lower = text.toLowerCase();
    return HUMANISER_SWAPS
      .filter(([formal]) => lower.includes(formal))
      .map(([formal, natural]) => ({ found: formal, naturalAlternative: natural }))
      .slice(0, 6);
  }

  _insufficientText() {
    return {
      aiProbability: 0, humanProbability: 0, level: "INSUFFICIENT_TEXT",
      isAIGenerated: false, isHumanised: false,
      features: {}, statistics: { wordCount: 0 },
      flaggedPhrases: [], humaniserTokens: [],
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new AIContentDetector();
