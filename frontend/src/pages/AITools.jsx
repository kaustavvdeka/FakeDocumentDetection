import { useState } from 'react';
import { BrainCircuit, FileText, CheckCircle2, AlertTriangle, XCircle, Search, ShieldCheck, Zap } from 'lucide-react';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const classificationMeta = {
  LIKELY_HUMAN:       { label: 'Likely Human',       color: 'emerald', icon: CheckCircle2 },
  MOSTLY_HUMAN:       { label: 'Mostly Human',       color: 'green',   icon: CheckCircle2 },
  MIXED:              { label: 'Mixed / Uncertain',  color: 'yellow',  icon: AlertTriangle },
  LIKELY_AI:          { label: 'Likely AI Generated',color: 'orange',  icon: XCircle },
  STRONG_AI:          { label: 'Strong AI Signal',   color: 'red',     icon: XCircle },
  INSUFFICIENT_TEXT:  { label: 'Insufficient Text',  color: 'gray',    icon: AlertTriangle },
};

const colorMap = {
  emerald: { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', bar: 'bg-emerald-500' },
  green:   { badge: 'bg-green-500/20  text-green-400   border-green-500/30',   bar: 'bg-green-500'   },
  yellow:  { badge: 'bg-yellow-500/20 text-yellow-400  border-yellow-500/30',  bar: 'bg-yellow-500'  },
  orange:  { badge: 'bg-orange-500/20 text-orange-400  border-orange-500/30',  bar: 'bg-orange-500'  },
  red:     { badge: 'bg-red-500/20    text-red-400     border-red-500/30',     bar: 'bg-red-500'     },
  gray:    { badge: 'bg-gray-500/20   text-gray-400    border-gray-500/30',    bar: 'bg-gray-500'    },
  blue:    { badge: 'bg-blue-500/20   text-blue-400    border-blue-500/30',    bar: 'bg-blue-500'    },
};

const confidenceMeta = {
  HIGH:   { label: 'High Confidence',   color: 'emerald' },
  MEDIUM: { label: 'Medium Confidence', color: 'yellow'  },
  LOW:    { label: 'Low Confidence',    color: 'orange'  },
};

function ScoreBar({ label, score, weight, description }) {
  // Score is AI-likeness (0=human, 100=AI)
  const barColor =
    score < 35  ? colorMap.emerald.bar :
    score < 55  ? colorMap.yellow.bar  :
                  colorMap.red.bar;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <div>
          <span className="text-sm text-white font-medium">{label}</span>
          {weight && <span className="ml-2 text-xs text-gray-500">({weight}% weight)</span>}
        </div>
        <span className={`text-sm font-bold ${score < 35 ? 'text-emerald-400' : score < 55 ? 'text-yellow-400' : 'text-red-400'}`}>
          {score}%
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );
}

const AITools = () => {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);

  const handleAnalyze = async () => {
    if (!text || text.length < 50) {
      toast.error('Please enter at least 50 characters of text for analysis.');
      return;
    }
    setIsAnalyzing(true);
    setResults(null);
    try {
      const res = await api.analyzeText({ text, title: 'User Submission' });
      if (res.success) {
        setResults(res.data);
        toast.success('Analysis complete');
      } else {
        toast.error(res.error || 'Failed to analyze text');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const ai = results?.aiDetection;
  const meta = ai ? (classificationMeta[ai.classification] || classificationMeta.INSUFFICIENT_TEXT) : null;
  const confMeta = ai ? (confidenceMeta[ai.confidenceLevel] || confidenceMeta.LOW) : null;
  const ClassIcon = meta?.icon || BrainCircuit;
  const mainColor = meta ? colorMap[meta.color] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-white mb-2 flex justify-center items-center gap-2">
          <BrainCircuit className="w-8 h-8 text-primary" />
          AI Analysis Tools
        </h1>
        <p className="text-gray-400">Advanced 10-factor AI content detection, plagiarism check &amp; entity extraction</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── INPUT PANEL ─────────────────────────────────────────── */}
        <div className="glass-panel p-6 flex flex-col">
          <h3 className="text-xl font-semibold text-white mb-4">Input Text</h3>
          <textarea
            className="w-full flex-1 min-h-64 p-4 rounded-xl bg-black/40 border border-white/10 text-gray-300 focus:outline-none focus:border-primary resize-none"
            placeholder="Paste document text here for AI analysis..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="flex items-center justify-between mt-2 mb-4">
            <span className="text-xs text-gray-500">{text.length} characters</span>
            <span className={`text-xs ${text.length >= 500 ? 'text-emerald-400' : text.length >= 50 ? 'text-yellow-400' : 'text-gray-600'}`}>
              {text.length >= 500 ? '✓ Good length for high confidence' : text.length >= 50 ? '⚠ Minimum met, more text = higher accuracy' : 'Min. 50 characters required'}
            </span>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="btn-primary w-full py-4 font-semibold flex items-center justify-center space-x-2"
          >
            {isAnalyzing
              ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              : <Search className="w-5 h-5" />
            }
            <span>{isAnalyzing ? 'Analyzing...' : 'Run Deep Analysis'}</span>
          </button>
        </div>

        {/* ── RESULTS PANEL ───────────────────────────────────────── */}
        <div className="glass-panel p-6 overflow-y-auto" style={{ maxHeight: '700px' }}>
          <h3 className="text-xl font-semibold text-white mb-4">Detection Report</h3>

          {!results && !isAnalyzing && (
            <div className="text-center text-gray-500 mt-20">
              <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Enter text and run analysis to see the full detection report.</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="mt-10 space-y-4">
              {['Running perplexity analysis...', 'Analysing stylometric features...', 'Detecting emotional patterns...', 'Computing ensemble score...'].map((msg, i) => (
                <div key={i} className="flex items-center space-x-3 text-gray-300 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="text-sm">{msg}</span>
                </div>
              ))}
            </div>
          )}

          {results && ai && (
            <div className="space-y-5 animate-fade-in-up">

              {/* ── MAIN SCORE CARD ─────────────────────────────── */}
              <div className={`rounded-2xl border p-5 ${mainColor?.badge} border-opacity-50`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest opacity-70 mb-1">AI Detection Score</p>
                    <div className="text-5xl font-black">{ai.aiProbability}%</div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${mainColor?.badge}`}>
                      <ClassIcon className="w-4 h-4" />
                      {meta?.label}
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorMap[confMeta?.color]?.badge}`}>
                        {confMeta?.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Probability Bar */}
                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${mainColor?.bar}`}
                    style={{ width: `${ai.aiProbability}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs opacity-60">
                  <span>0% Human</span>
                  <span>50% Mixed</span>
                  <span>100% AI</span>
                </div>

                {/* Humaniser Badge */}
                {ai.isHumanised && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-sm">
                    <Zap className="w-4 h-4" />
                    <strong>Humanizer Tool Detected</strong> — AI text paraphrased via QuillBot / StealthWriter
                  </div>
                )}
              </div>

              {/* ── DETAILED SCORES ──────────────────────────────── */}
              {ai.detailedScores && Object.keys(ai.detailedScores).length > 0 && (
                <div className="p-4 rounded-xl border border-white/10 bg-black/20">
                  <h4 className="font-semibold text-white mb-4 border-b border-white/10 pb-2">📊 Detailed Analysis</h4>
                  <ScoreBar label="Perplexity & Predictability"         weight={25} score={ai.detailedScores.perplexityScore}       description="Low uniqueness = predictable = AI pattern" />
                  <ScoreBar label="Burstiness & Sentence Variation"     weight={15} score={ai.detailedScores.burstinessScore}       description="Uniform lengths = AI; varied = human" />
                  <ScoreBar label="Stylometric & Linguistic Features"   weight={15} score={ai.detailedScores.stylometricScore}      description="AI phrase density and punctuation diversity" />
                  <ScoreBar label="Semantic Coherence"                  weight={10} score={ai.detailedScores.semanticCoherence}     description="Unnaturally smooth topic flow between sentences" />
                  <ScoreBar label="Token Entropy"                       weight={10} score={ai.detailedScores.tokenEntropy}          description="Low vocabulary richness signals AI generation" />
                  <ScoreBar label="Repetition & Redundancy"             weight={5}  score={ai.detailedScores.repetitionScore}       description="Repeated phrases and template-like sentence openers" />
                  <ScoreBar label="Syntax & Grammar Uniformity"         weight={5}  score={ai.detailedScores.syntaxUniformity}      description="Uniform clause structures = AI" />
                  <ScoreBar label="Human Error Signals"                 weight={5}  score={ai.detailedScores.humanErrorSignals}     description="Fewer writing imperfections = more AI-like" />
                  <ScoreBar label="Emotional & Psychological Variability" weight={5} score={ai.detailedScores.emotionalVariability} description="Flat emotional tone = AI; fluctuating = human" />
                  <ScoreBar label="Contextual Authenticity"             weight={5}  score={ai.detailedScores.authenticitySignals}   description="Absence of personal experience cues = AI" />
                </div>
              )}

              {/* ── STRENGTH INDICATORS ──────────────────────────── */}
              <div className="grid grid-cols-1 gap-4">
                {ai.humanTraits?.length > 0 && (
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <h4 className="font-semibold text-emerald-400 mb-2 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Human-like Traits Found
                    </h4>
                    <ul className="space-y-1">
                      {ai.humanTraits.map((t, i) => (
                        <li key={i} className="text-xs text-emerald-300 flex items-start gap-1.5">
                          <span className="mt-0.5">•</span>{t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {ai.aiTraits?.length > 0 && (
                  <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                    <h4 className="font-semibold text-red-400 mb-2 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> AI-like Traits Found
                    </h4>
                    <ul className="space-y-1">
                      {ai.aiTraits.map((t, i) => (
                        <li key={i} className="text-xs text-red-300 flex items-start gap-1.5">
                          <span className="mt-0.5">•</span>{t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* ── FINAL VERDICT ────────────────────────────────── */}
              {ai.verdict && (
                <div className="p-4 rounded-xl border border-white/10 bg-black/30">
                  <h4 className="font-semibold text-white mb-2 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" /> Final Verdict
                  </h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{ai.verdict}</p>
                </div>
              )}

              {/* ── FLAGGED PHRASES ───────────────────────────────── */}
              {ai.flaggedPhrases?.length > 0 && (
                <div className="p-4 rounded-xl border border-white/10 bg-black/20">
                  <h4 className="font-semibold text-white mb-2 text-sm">🚩 Flagged AI Phrases</h4>
                  <div className="flex flex-wrap gap-2">
                    {ai.flaggedPhrases.map((p, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/20">
                        "{p}"
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── HUMANISER TOKENS ─────────────────────────────── */}
              {ai.isHumanised && ai.humaniserTokens?.length > 0 && (
                <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
                  <h4 className="font-semibold text-yellow-400 mb-2 text-sm">⚡ Humanizer Swaps Detected</h4>
                  <div className="flex flex-wrap gap-2">
                    {ai.humaniserTokens.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/20">
                        "{t.found}" → "{t.naturalAlternative}"
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── STATISTICS ───────────────────────────────────── */}
              {ai.statistics && (
                <div className="p-4 rounded-xl border border-white/10 bg-black/20">
                  <h4 className="font-semibold text-white mb-2 text-sm border-b border-white/10 pb-2">📈 Text Statistics</h4>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {[
                      ['Words', ai.statistics.wordCount],
                      ['Sentences', ai.statistics.sentenceCount],
                      ['Paragraphs', ai.statistics.paragraphCount],
                      ['Avg Words/Sent', ai.statistics.avgWordsPerSent],
                      ['Avg Word Len', ai.statistics.avgWordLength],
                      ['Unique Word %', ai.statistics.uniqueWordRatio],
                    ].map(([label, value]) => (
                      <div key={label} className="text-center bg-white/5 rounded-lg p-2">
                        <p className="text-lg font-bold text-white">{value}</p>
                        <p className="text-xs text-gray-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── PLAGIARISM ───────────────────────────────────── */}
              <div className="p-4 rounded-xl border border-white/10 bg-black/20">
                <h4 className="font-semibold text-white mb-2 border-b border-white/10 pb-2">📑 Plagiarism Check</h4>
                <div className="mt-2">
                  <p className="text-sm text-gray-400">Similarity Score</p>
                  <p className={`text-3xl font-bold mb-2 ${results.plagiarism.overallScore < 20 ? 'text-emerald-400' : results.plagiarism.overallScore < 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {results.plagiarism.overallScore}%
                  </p>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium border ${results.plagiarism.isPlagiarised ? colorMap.red.badge : colorMap.emerald.badge}`}>
                    {results.plagiarism.isPlagiarised
                      ? <><XCircle className="w-4 h-4" /> Plagiarism Detected</>
                      : <><CheckCircle2 className="w-4 h-4" /> Original Content</>
                    }
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{results.plagiarism.totalSourcesChecked} reference documents checked</p>
                </div>
              </div>

              {/* ── NER ENTITIES ─────────────────────────────────── */}
              <div className="p-4 rounded-xl border border-white/10 bg-black/20">
                <h4 className="font-semibold text-white mb-2 border-b border-white/10 pb-2">🔍 Extracted Entities (NER)</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Names', items: results.entities.names, color: 'bg-primary/20 text-primary border-primary/20' },
                    { label: 'Organizations', items: results.entities.organizations, color: 'bg-purple-500/20 text-purple-400 border-purple-500/20' },
                    { label: 'Dates', items: results.entities.dates, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' },
                  ].map(({ label, items, color }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                      <div className="flex flex-wrap gap-2">
                        {items?.length > 0 ? items.map((item, i) => (
                          <span key={i} className={`px-2 py-1 rounded border text-xs ${color}`}>{item}</span>
                        )) : <span className="text-xs text-gray-600">None found</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AITools;
