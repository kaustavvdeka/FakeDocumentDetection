/**
 * AI Content Detector — Advanced Multi-Layer Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses a 10-factor weighted ensemble scoring system to distinguish between
 * Human-written, AI-generated, Mixed, and Humaniser-edited content.
 *
 * Weight Distribution:
 *  1. Perplexity & Predictability           → 25%
 *  2. Burstiness & Sentence Variation       → 15%
 *  3. Stylometric & Linguistic Features     → 15%
 *  4. Semantic Coherence Patterns           → 10%
 *  5. Token Probability Distribution        → 10%
 *  6. Repetition & Redundancy               →  5%
 *  7. Syntax & Grammar Uniformity           →  5%
 *  8. Human Error & Natural Imperfections   →  5%
 *  9. Emotional & Psychological Variability →  5%
 * 10. Contextual Authenticity & Experience  →  5%
 */

// ─── Common AI-signature phrases ─────────────────────────────────────────────
const COMMON_AI_PHRASES = [
  "it is important to note", "in conclusion", "furthermore", "moreover",
  "it is worth noting", "in summary", "to summarize", "as mentioned earlier",
  "it is crucial", "in today's world", "in the realm of", "delve into",
  "navigating the", "it is essential to", "it should be noted",
  "on the other hand", "when it comes to", "in terms of", "needless to say",
  "rest assured", "at the end of the day", "the landscape of", "as we can see",
  "in light of", "shed light on", "it goes without saying", "that being said",
  "it is undeniable", "take a closer look", "a multifaceted approach",
  "in this regard", "with that in mind", "as previously mentioned",
];

// ─── Humaniser synonym swaps (QuillBot / StealthWriter patterns) ──────────────
const HUMANISER_SWAPS = [
  ["utilize", "use"], ["commence", "start"], ["acquire", "get"],
  ["endeavour", "try"], ["subsequent", "next"], ["prior to", "before"],
  ["in order to", "to"], ["ascertain", "find out"], ["facilitate", "help"],
  ["demonstrate", "show"], ["comprehend", "understand"], ["indicate", "show"],
  ["numerous", "many"], ["additional", "more"], ["significant", "important"],
  ["implement", "do"], ["leverage", "use"], ["optimal", "best"],
  ["subsequently", "then"], ["consequently", "so"], ["nevertheless", "however"],
  ["paramount", "crucial"], ["exemplify", "show"], ["pertaining to", "about"],
];

// ─── Emotional / Subjective signal words ─────────────────────────────────────
const EMOTIONAL_WORDS = [
  "love", "hate", "feel", "felt", "angry", "sad", "happy", "excited",
  "frustrated", "terrified", "lonely", "proud", "ashamed", "worried",
  "anxious", "joy", "grief", "passion", "miss", "heartbroken", "thrilled",
  "overwhelmed", "nervous", "relieved", "regret", "afraid", "hopeful",
];

// ─── Sensory / authentic experience signals ───────────────────────────────────
const SENSORY_WORDS = [
  "smelled", "tasted", "heard", "saw", "felt", "noticed", "remembered",
  "reminds me", "once", "when i was", "back then", "that day", "i recall",
  "in my experience", "personally", "my friend", "we were", "i used to",
  "growing up", "i remember", "my mom", "my dad", "my teacher",
];

// ─── Human error signals ─────────────────────────────────────────────────────
const ERROR_PATTERNS = [
  /\b(\w+)\s+\1\b/gi,               // Repeated words: "the the"
  /[a-z][A-Z]/g,                    // Missing space: "wordWord"
  /\s{2,}/g,                        // Extra whitespace
  /[,;]\s*[,;]/g,                   // Double punctuation
  /\bi\s+[a-z]/g,                   // Lowercase 'i' (informal writing)
];

class AIContentDetector {
  async analyse(text) {
    if (!text || text.trim().length < 50) {
      return this._insufficientText();
    }

    const sentences  = this._splitSentences(text);
    const words      = this._tokenizeWords(text);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);

    // ── Compute all 10 raw feature scores (0–100, higher = more AI-like) ──
    const rawScores = {
      perplexity:    this._perplexityScore(sentences, words),
      burstiness:    this._burstinessScore(sentences, paragraphs),
      stylometric:   this._stylometricScore(text, words, sentences),
      semanticCoh:   this._semanticCoherenceScore(sentences),
      tokenEntropy:  this._tokenEntropyScore(text, words),
      repetition:    this._repetitionScore(text, sentences),
      syntaxUniform: this._syntaxUniformityScore(sentences),
      humanErrors:   this._humanErrorScore(text),
      emotional:     this._emotionalVariabilityScore(text),
      authenticity:  this._authenticityScore(text),
    };

    // ── Weighted combination ──────────────────────────────────────────────
    const aiProbability = Math.round(Math.min(100, Math.max(0,
      rawScores.perplexity    * 0.25 +
      rawScores.burstiness    * 0.15 +
      rawScores.stylometric   * 0.15 +
      rawScores.semanticCoh   * 0.10 +
      rawScores.tokenEntropy  * 0.10 +
      rawScores.repetition    * 0.05 +
      rawScores.syntaxUniform * 0.05 +
      rawScores.humanErrors   * 0.05 +   // inverse: high error = more human
      rawScores.emotional     * 0.05 +   // inverse: high emotion = more human
      rawScores.authenticity  * 0.05     // inverse: high auth = more human
    )));

    const humanProbability = 100 - aiProbability;
    const classification = this._classify(aiProbability);
    const confidence = this._confidenceLevel(text.length, sentences.length);

    // ── Humaniser detection ───────────────────────────────────────────────
    const humaniserScore  = this._humaniserScore(text);
    const isHumanised     = humaniserScore > 35 && aiProbability > 40;
    const humaniserTokens = this._getHumaniserTokens(text);

    // ── Trait collection ──────────────────────────────────────────────────
    const humanTraits = this._detectHumanTraits(rawScores, text);
    const aiTraits    = this._detectAITraits(rawScores, text);

    // ── Final verdict ─────────────────────────────────────────────────────
    const verdict = this._buildVerdict(aiProbability, classification, isHumanised, rawScores);

    return {
      // ── Summary ──────────────────────────────────────────────────────
      aiProbability,
      humanProbability,
      classification,        // "LIKELY_HUMAN" | "MOSTLY_HUMAN" | "MIXED" | "LIKELY_AI" | "STRONG_AI"
      isAIGenerated: aiProbability >= 60,
      isHumanised,

      // ── Detailed metrics (all 0–100) ──────────────────────────────────
      detailedScores: {
        perplexityScore:    Math.round(rawScores.perplexity),
        burstinessScore:    Math.round(rawScores.burstiness),
        stylometricScore:   Math.round(rawScores.stylometric),
        semanticCoherence:  Math.round(rawScores.semanticCoh),
        tokenEntropy:       Math.round(rawScores.tokenEntropy),
        repetitionScore:    Math.round(rawScores.repetition),
        syntaxUniformity:   Math.round(rawScores.syntaxUniform),
        humanErrorSignals:  Math.round(rawScores.humanErrors),
        emotionalVariability: Math.round(rawScores.emotional),
        authenticitySignals: Math.round(rawScores.authenticity),
      },

      // ── Strength indicators ───────────────────────────────────────────
      humanTraits,
      aiTraits,

      // ── Confidence & verdict ──────────────────────────────────────────
      confidenceLevel: confidence,
      verdict,

      // ── Supporting data ───────────────────────────────────────────────
      flaggedPhrases:  this._getFlaggedPhrases(text),
      humaniserTokens,
      statistics: {
        wordCount:       words.length,
        sentenceCount:   sentences.length,
        paragraphCount:  paragraphs.length,
        avgWordsPerSent: Math.round(words.length / Math.max(sentences.length, 1)),
        avgWordLength:   (words.reduce((s, w) => s + w.length, 0) / Math.max(words.length, 1)).toFixed(2),
        uniqueWordRatio: ((new Set(words).size / Math.max(words.length, 1)) * 100).toFixed(1) + "%",
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MATHEMATICAL & NLP ADVANCED HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Zipf's Law R2 Correlation
   * Calculates the linear regression correlation coefficient (R2) of word ranks vs frequency logs.
   * Human text is chaotic (lower R2, e.g. 0.82-0.93), AI matches power-law Zipfian slope perfectly (high R2, e.g. >0.96).
   */
  _calculateZipfR2(words) {
    if (words.length < 30) return 0.5; // Default neutral correlation
    const freq = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;
    const sortedFreqs = Object.values(freq).sort((a, b) => b - a);
    
    // Need at least 5 ranks to run regression
    if (sortedFreqs.length < 5) return 0.5;
    
    const data = [];
    for (let i = 0; i < sortedFreqs.length; i++) {
      data.push({ x: Math.log(i + 1), y: Math.log(sortedFreqs[i]) });
    }
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
    const n = data.length;
    for (const p of data) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
      sumYY += p.y * p.y;
    }
    
    const meanX = sumX / n;
    const meanY = sumY / n;
    
    const numerator = sumXY - n * meanX * meanY;
    const denominator = Math.sqrt((sumXX - n * meanX * meanX) * (sumYY - n * meanY * meanY));
    
    if (denominator === 0) return 0.5;
    const r = numerator / denominator;
    return Math.min(1, Math.max(0, r * r)); // R2
  }

  /**
   * Counts syllables in a word (approximate rule-based local algorithm)
   */
  _countSyllables(word) {
    let w = word.toLowerCase().trim();
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    w = w.replace(/^y/, '');
    const syl = w.match(/[aeiouy]{1,2}/g);
    return syl ? syl.length : 1;
  }

  /**
   * Calculates Flesch Reading Ease score for a given paragraph
   */
  _calculateFleschEase(para) {
    const sentences = this._splitSentences(para);
    const words = this._tokenizeWords(para);
    if (words.length === 0) return 100;
    const sentCount = Math.max(sentences.length, 1);
    let totalSyllables = 0;
    for (const w of words) {
      totalSyllables += this._countSyllables(w);
    }
    
    const ease = 206.835 - 1.015 * (words.length / sentCount) - 84.6 * (totalSyllables / words.length);
    return Math.max(0, Math.min(100, ease));
  }

  /**
   * Computes the standard deviation of readability indices across paragraphs
   * Low variance (stdDev < 6) indicates uniform complexity (AI signature)
   */
  _readabilityVariance(paragraphs) {
    if (paragraphs.length < 2) return 10; // Default lower variance
    const scores = paragraphs.map(p => this._calculateFleschEase(p));
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculates character-level Shannon entropy across sliding windows.
   * Return average and standard deviation (AI text has low stdDev due to flat entropy ceiling).
   */
  _calculateSlidingEntropy(text) {
    if (text.length < 150) return { avg: 4.2, stdDev: 0.1 };
    const windowSize = 120;
    const step = 40;
    const entropies = [];
    for (let i = 0; i < text.length - windowSize; i += step) {
      const chunk = text.slice(i, i + windowSize);
      const freq = {};
      for (const char of chunk) freq[char] = (freq[char] || 0) + 1;
      let h = 0;
      for (const count of Object.values(freq)) {
        const p = count / windowSize;
        h -= p * Math.log2(p);
      }
      entropies.push(h);
    }
    const mean = entropies.reduce((a, b) => a + b, 0) / entropies.length;
    const variance = entropies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / entropies.length;
    return { avg: mean, stdDev: Math.sqrt(variance) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  1. PERPLEXITY & PREDICTABILITY (25%)
  // ═══════════════════════════════════════════════════════════════════════════
  _perplexityScore(sentences, words) {
    if (words.length < 10) return 50;
    const bigrams = {};
    for (let i = 0; i < words.length - 1; i++) {
      const bg = `${words[i]} ${words[i + 1]}`;
      bigrams[bg] = (bigrams[bg] || 0) + 1;
    }
    const uniqueBigrams = Object.keys(bigrams).length;
    const totalBigrams  = words.length - 1;
    const uniquenessRatio = uniqueBigrams / totalBigrams;
    
    // Base predictability: low uniqueness of bigrams = AI
    const predictability = (1 - uniquenessRatio) * 100;
    
    // Zipf Power Law correlation fit
    const zipfR2 = this._calculateZipfR2(words);
    const zipfScore = zipfR2 * 100;
    
    return Math.max(0, Math.min(100, predictability * 0.4 + zipfScore * 0.6));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  2. BURSTINESS & SENTENCE VARIATION (15%)
  // ═══════════════════════════════════════════════════════════════════════════
  _burstinessScore(sentences, paragraphs) {
    if (sentences.length < 3) return 50;
    
    // Sentence length variation (coefficient of variation)
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const mean    = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length;
    const stdDev   = Math.sqrt(variance);
    const cv       = stdDev / (mean || 1);
    const lengthUniformity = Math.max(0, (1 - Math.min(cv / 0.6, 1)) * 100);
    
    // Readability standard deviation across paragraphs
    const readStdDev = this._readabilityVariance(paragraphs || []);
    // Low standard deviation (< 5) = high uniformity (AI), High variance (> 15) = human
    const readabilityUniformity = Math.max(0, Math.min(100, (1 - Math.min(readStdDev / 16, 1)) * 100));
    
    if (paragraphs && paragraphs.length >= 2) {
      return Math.round(lengthUniformity * 0.5 + readabilityUniformity * 0.5);
    }
    return Math.round(lengthUniformity);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  3. STYLOMETRIC & LINGUISTIC FEATURES (15%)
  // ═══════════════════════════════════════════════════════════════════════════
  _stylometricScore(text, words, sentences) {
    const sentCount     = Math.max(sentences.length, 1);
    const wordCount     = Math.max(words.length, 1);
    
    const semicolons    = (text.match(/;/g) || []).length;
    const dashes        = (text.match(/[—–]/g) || []).length;
    const exclamations  = (text.match(/!/g) || []).length;
    const questions     = (text.match(/\?/g) || []).length;
    const ellipsis      = (text.match(/\.\.\./g) || []).length;

    // Advanced punctuation richness — AI lacks variety
    const punctRichness = (semicolons + dashes + exclamations + questions * 0.5 + ellipsis) / sentCount;
    const avgWordLen    = words.reduce((s, w) => s + w.length, 0) / wordCount;
    const lenPenalty    = avgWordLen > 5.5 ? (avgWordLen - 5.5) * 12 : 0;
    const aiPhraseHits  = COMMON_AI_PHRASES.filter(p => text.toLowerCase().includes(p)).length;
    const phrasePenalty = Math.min(40, aiPhraseHits * 6);
    
    // Passive voice density (Auxiliary "be" + past participle)
    const passiveRegex = /\b(is|am|are|was|were|be|been|being)\b\s+(?:[a-z]+\s+)?(?:[a-z]+ed|seen|known|taken|written|done|made|built|given|kept|shown|found|run|thought|told|held|read|written)\b/gi;
    const passiveHits = (text.match(passiveRegex) || []).length;
    const passiveRatio = passiveHits / sentCount;
    const passivePenalty = Math.min(20, passiveRatio * 40);
    
    // Nominalizations (e.g. words ending in tion, ment, ity, ence, ance)
    const nominalizationRegex = /\b\w+(?:tion|ment|ity|ence|ance)s?\b/gi;
    const nominalizationHits = (text.match(nominalizationRegex) || []).length;
    const nominalizationRatio = nominalizationHits / wordCount;
    const nominalizationPenalty = Math.min(20, nominalizationRatio * 200);

    const score = lenPenalty + Math.max(0, 30 - punctRichness * 35) + phrasePenalty + passivePenalty + nominalizationPenalty;
    return Math.min(100, Math.max(0, score));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  4. SEMANTIC COHERENCE PATTERNS (10%)
  // ═══════════════════════════════════════════════════════════════════════════
  _semanticCoherenceScore(sentences) {
    if (sentences.length < 4) return 50;
    const vectorise = sent => {
      const ws = sent.toLowerCase().split(/\s+/);
      const v  = {};
      for (const w of ws) v[w] = (v[w] || 0) + 1;
      return v;
    };
    const cosine = (a, b) => {
      const terms = new Set([...Object.keys(a), ...Object.keys(b)]);
      let dot = 0, magA = 0, magB = 0;
      for (const t of terms) {
        dot  += (a[t] || 0) * (b[t] || 0);
        magA += (a[t] || 0) ** 2;
        magB += (b[t] || 0) ** 2;
      }
      return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
    };
    let totalSim = 0, count = 0;
    for (let i = 0; i < sentences.length - 1; i++) {
      totalSim += cosine(vectorise(sentences[i]), vectorise(sentences[i + 1]));
      count++;
    }
    const avgSim = totalSim / count;
    return Math.round(avgSim * 100);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  5. TOKEN PROBABILITY DISTRIBUTION (10%)
  // ═══════════════════════════════════════════════════════════════════════════
  _tokenEntropyScore(text, words) {
    if (words.length < 10) return 50;
    const freq = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;
    const hapax     = Object.values(freq).filter(f => f === 1).length;
    const hapaxRatio = hapax / words.length;
    const ttr        = new Set(words).size / words.length;
    const richness   = ttr * 0.6 + hapaxRatio * 0.4;
    const vocabularyScore = (1 - Math.min(richness * 2, 1)) * 100;
    
    // Character entropy profiles
    const entropyResult = this._calculateSlidingEntropy(text);
    // Low standard deviation (< 0.05) indicates AI
    const entropyFlatness = Math.max(0, Math.min(100, (1 - Math.min(entropyResult.stdDev / 0.15, 1)) * 100));
    
    return Math.round(vocabularyScore * 0.5 + entropyFlatness * 0.5);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  6. REPETITION & REDUNDANCY (5%)
  // ═══════════════════════════════════════════════════════════════════════════
  _repetitionScore(text, sentences) {
    const lines = text.split("\n").filter(l => l.trim().length > 10);
    const seen  = new Set();
    let dupLines = 0;
    for (const l of lines) {
      const t = l.trim().toLowerCase();
      if (seen.has(t)) dupLines++;
      seen.add(t);
    }

    const starters  = sentences.map(s => s.trim().split(/\s+/)[0]?.toLowerCase());
    const starterFreq = {};
    for (const st of starters) starterFreq[st] = (starterFreq[st] || 0) + 1;
    const maxRepeat = Math.max(...Object.values(starterFreq), 0);
    const starterRepeatRatio = sentences.length > 0 ? maxRepeat / sentences.length : 0;

    const dupScore    = Math.min(40, dupLines * 8);
    const starterScore = Math.min(40, starterRepeatRatio * 80);

    const phraseCount = COMMON_AI_PHRASES.filter(p => text.toLowerCase().includes(p)).length;
    const phraseScore = Math.min(20, phraseCount * 4);

    return Math.min(100, dupScore + starterScore + phraseScore);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  7. SYNTAX & GRAMMAR UNIFORMITY (5%)
  // ═══════════════════════════════════════════════════════════════════════════
  _syntaxUniformityScore(sentences) {
    if (sentences.length < 4) return 40;
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const mean    = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length;
    const cv      = Math.sqrt(variance) / (mean || 1);

    const hasFragments = lengths.filter(l => l <= 3).length;
    const hasRunOns    = lengths.filter(l => l >= 40).length;
    const humanSignals = Math.min(20, (hasFragments + hasRunOns) * 5);

    const uniformityPenalty = Math.max(0, (1 - Math.min(cv / 0.5, 1)) * 80);
    return Math.max(0, Math.min(100, uniformityPenalty - humanSignals));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  8. HUMAN ERROR & NATURAL IMPERFECTIONS (5%)
  // ═══════════════════════════════════════════════════════════════════════════
  _humanErrorScore(text) {
    let errorCount = 0;
    for (const pattern of ERROR_PATTERNS) {
      const matches = text.match(pattern) || [];
      errorCount += matches.length;
    }
    const informalI = (text.match(/\bi\s+[a-z]/g) || []).length;
    errorCount += informalI * 2;

    const contractions = (text.match(/\b\w+n't\b|\bi'm\b|\bi've\b|\bwe're\b|\bthey're\b|\bit's\b/gi) || []).length;
    errorCount += contractions;

    const humanSignal = Math.min(100, errorCount * 8);
    return Math.max(0, 100 - humanSignal);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  9. EMOTIONAL & PSYCHOLOGICAL VARIABILITY (5%)
  // ═══════════════════════════════════════════════════════════════════════════
  _emotionalVariabilityScore(text) {
    const lower = text.toLowerCase();
    let emotionHits = 0;
    for (const word of EMOTIONAL_WORDS) {
      if (lower.includes(word)) emotionHits++;
    }
    const exclamations = (text.match(/!/g) || []).length;
    const questions    = (text.match(/\?/g) || []).length;
    const toneShifts   = exclamations + questions;

    const humanEmotion = Math.min(100, emotionHits * 10 + toneShifts * 6);
    return Math.max(0, 100 - humanEmotion);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. CONTEXTUAL AUTHENTICITY & EXPERIENCE SIGNALS (5%)
  // ═══════════════════════════════════════════════════════════════════════════
  _authenticityScore(text) {
    const lower = text.toLowerCase();
    let hits = 0;
    for (const word of SENSORY_WORDS) {
      if (lower.includes(word)) hits++;
    }
    const firstPerson = (text.match(/\b(i|me|my|mine|myself|we|our|us)\b/gi) || []).length;
    const authSignal  = Math.min(100, hits * 12 + firstPerson * 2);
    return Math.max(0, 100 - authSignal);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  HUMANISER DETECTOR
  // ═══════════════════════════════════════════════════════════════════════════
  _humaniserScore(text) {
    const lower = text.toLowerCase();
    let hits = 0;
    for (const [formal] of HUMANISER_SWAPS) {
      if (lower.includes(formal)) hits++;
    }
    return Math.min(100, hits * 8);
  }

  _getHumaniserTokens(text) {
    const lower = text.toLowerCase();
    return HUMANISER_SWAPS
      .filter(([formal]) => lower.includes(formal))
      .map(([formal, natural]) => ({ found: formal, naturalAlternative: natural }))
      .slice(0, 8);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  _classify(prob) {
    if (prob < 20) return "LIKELY_HUMAN";
    if (prob < 40) return "MOSTLY_HUMAN";
    if (prob < 60) return "MIXED";
    if (prob < 80) return "LIKELY_AI";
    return "STRONG_AI";
  }

  _confidenceLevel(charCount, sentenceCount) {
    if (charCount > 1500 && sentenceCount > 10) return "HIGH";
    if (charCount > 500  && sentenceCount > 5)  return "MEDIUM";
    return "LOW";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TRAIT BUILDERS
  // ═══════════════════════════════════════════════════════════════════════════
  _detectHumanTraits(scores, text) {
    const traits = [];
    if (scores.burstiness < 35)    traits.push("Natural sentence length variation detected");
    if (scores.humanErrors < 40)   traits.push("Human writing imperfections and contractions present");
    if (scores.emotional < 35)     traits.push("Emotional tone and subjective language found");
    if (scores.authenticity < 40)  traits.push("Personal experience and sensory details present");
    if (scores.stylometric < 40)   traits.push("Diverse punctuation and informal writing style");
    if (scores.tokenEntropy < 40)  traits.push("Rich vocabulary with uncommon word choices");
    if (scores.repetition < 25)    traits.push("Low repetition of phrases and sentence starters");
    if ((text.match(/\bI\b/g) || []).length > 3) traits.push("Strong first-person writing perspective");
    return traits;
  }

  _detectAITraits(scores, text) {
    const traits = [];
    if (scores.perplexity > 60)    traits.push("High token predictability — low-perplexity text pattern");
    if (scores.burstiness > 60)    traits.push("Uniform sentence lengths — typical AI structural pattern");
    if (scores.stylometric > 60)   traits.push("Elevated use of AI transition phrases");
    if (scores.semanticCoh > 60)   traits.push("Unnaturally smooth semantic flow between sentences");
    if (scores.tokenEntropy > 60)  traits.push("Low vocabulary diversity — high token repetition");
    if (scores.repetition > 50)    traits.push("Repetitive phrase openers and template-style structure");
    if (scores.syntaxUniform > 55) traits.push("Homogeneous clause structures — parse tree similarity");
    if (scores.humanErrors > 70)   traits.push("Absence of natural human writing imperfections");
    if (scores.emotional > 70)     traits.push("Emotionally flat and tonally neutral writing");
    if (scores.authenticity > 70)  traits.push("Lack of personal experience or sensory detail cues");
    return traits;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  VERDICT BUILDER
  // ═══════════════════════════════════════════════════════════════════════════
  _buildVerdict(prob, classification, isHumanised, scores) {
    const classLabels = {
      LIKELY_HUMAN: "Likely Human",
      MOSTLY_HUMAN: "Mostly Human",
      MIXED:        "Mixed / Uncertain",
      LIKELY_AI:    "Likely AI Generated",
      STRONG_AI:    "Strong AI Signal",
    };

    const label = classLabels[classification];

    if (isHumanised) {
      return `The content shows strong signs of AI origin that has been processed through a paraphrasing or "humanizer" tool (e.g. QuillBot, StealthWriter). While surface-level language appears more natural, the underlying structural patterns, vocabulary substitution traces, and semantic uniformity remain detectable. Classification: ${label}.`;
    }

    if (prob < 20) {
      return `The text demonstrates strong markers of authentic human authorship — including natural sentence variation, emotional tone, personal experience signals, and writing imperfections. The multi-layer ensemble analysis consistently returns human-like patterns across the majority of features. Classification: ${label}.`;
    }
    if (prob < 40) {
      return `The text is predominantly human in character, though some AI-adjacent regularities are present. This may reflect a well-educated writer or a lightly AI-assisted draft. The stylometric and burstiness profiles favor human authorship. Classification: ${label}.`;
    }
    if (prob < 60) {
      return `The content shows a blend of human and AI-generated signals. This is typical of human-edited AI drafts, collaborative writing tools, or technical / academic writing styles. No definitive classification can be made. Classification: ${label}.`;
    }
    if (prob < 80) {
      return `The text exhibits multiple high-confidence AI generation signals, including uniform sentence structure, elevated use of common AI transition phrases, low vocabulary entropy, and minimal human error signals. Classification: ${label}.`;
    }
    return `The text carries a very strong AI generation fingerprint across nearly all detection layers — high perplexity predictability, structurally uniform syntax, emotionally neutral tone, absence of personal experience signals, and template-like phrasing. This content is highly likely to have been generated directly by a large language model. Classification: ${label}.`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  _getFlaggedPhrases(text) {
    const lower = text.toLowerCase();
    return COMMON_AI_PHRASES.filter(p => lower.includes(p)).slice(0, 10);
  }

  _splitSentences(text) {
    return (text.match(/[^.!?]+[.!?]+/g) || [text]).map(s => s.trim()).filter(Boolean);
  }

  _tokenizeWords(text) {
    return text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(w => w.length > 1);
  }

  _insufficientText() {
    return {
      aiProbability: 0, humanProbability: 0,
      classification: "INSUFFICIENT_TEXT",
      isAIGenerated: false, isHumanised: false,
      detailedScores: {},
      humanTraits: [], aiTraits: [],
      confidenceLevel: "LOW",
      verdict: "Insufficient text provided for analysis. Please submit at least 50 characters.",
      flaggedPhrases: [], humaniserTokens: [],
      statistics: { wordCount: 0 },
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new AIContentDetector();
