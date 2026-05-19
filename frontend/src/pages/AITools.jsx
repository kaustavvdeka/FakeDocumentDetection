import { useState } from 'react';
import { BrainCircuit, FileText, CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

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

  const renderScore = (score, inverse = false) => {
    const isGood = inverse ? score < 30 : score > 70;
    const isWarning = inverse ? (score >= 30 && score < 70) : (score <= 70 && score > 30);
    
    let colorClass = 'text-red-400';
    if (isGood) colorClass = 'text-emerald-400';
    else if (isWarning) colorClass = 'text-yellow-400';

    return <span className={`font-bold ${colorClass}`}>{score}%</span>;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-white mb-2 flex justify-center items-center gap-2">
          <BrainCircuit className="w-8 h-8 text-primary" />
          AI Analysis Tools
        </h1>
        <p className="text-gray-400">Plagiarism Detection, AI Content Detection & Entity Extraction</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Input Text</h3>
          <textarea
            className="w-full h-64 p-4 rounded-xl bg-black/40 border border-white/10 text-gray-300 focus:outline-none focus:border-primary resize-none"
            placeholder="Paste document text here for AI analysis..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          ></textarea>
          
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="btn-primary w-full py-4 mt-4 font-semibold flex items-center justify-center space-x-2"
          >
            {isAnalyzing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Search className="w-5 h-5" />
            )}
            <span>{isAnalyzing ? 'Analyzing...' : 'Run Analysis'}</span>
          </button>
        </div>

        <div className="glass-panel p-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
          <h3 className="text-xl font-semibold text-white mb-4">Results</h3>
          
          {!results && !isAnalyzing && (
            <div className="text-center text-gray-500 mt-20">
              <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Enter text and run analysis to see results.</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center text-gray-500 mt-20">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-white/10 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-white/10 rounded w-1/2 mx-auto"></div>
                <div className="h-4 bg-white/10 rounded w-5/6 mx-auto"></div>
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-6 animate-fade-in-up">
              {/* AI Detection */}
              <div className="p-4 rounded-xl border border-white/10 bg-black/20">
                <h4 className="font-semibold text-white mb-2 border-b border-white/10 pb-2">🤖 AI Content Detection</h4>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-400">AI Probability</p>
                    <p className="text-2xl">{renderScore(results.aiDetection.aiProbability, true)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Human Probability</p>
                    <p className="text-2xl">{renderScore(results.aiDetection.humanProbability)}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-1">Assessment:</p>
                  <div className={`p-2 rounded-lg text-sm font-medium inline-block ${
                    results.aiDetection.isAIGenerated ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {results.aiDetection.isAIGenerated ? (
                      <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Likely AI Generated</span>
                    ) : (
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Likely Human Written</span>
                    )}
                  </div>
                  
                  {results.aiDetection.isHumanised && (
                    <div className="mt-2 p-2 rounded-lg text-sm font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 inline-block">
                      <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Humanizer Tool Detected (e.g. QuillBot)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Plagiarism */}
              <div className="p-4 rounded-xl border border-white/10 bg-black/20">
                <h4 className="font-semibold text-white mb-2 border-b border-white/10 pb-2">📑 Plagiarism Check</h4>
                <div className="mt-2">
                  <p className="text-sm text-gray-400">Similarity Score</p>
                  <p className="text-2xl mb-2">{renderScore(results.plagiarism.overallScore, true)}</p>
                  
                  {results.plagiarism.isPlagiarised ? (
                     <div className="p-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 inline-block">
                       <span className="flex items-center gap-1"><XCircle className="w-4 h-4"/> Plagiarism Detected</span>
                     </div>
                  ) : (
                    <div className="p-2 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-block">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Original Content</span>
                    </div>
                  )}
                </div>
              </div>

              {/* OCR / NER Entities */}
              <div className="p-4 rounded-xl border border-white/10 bg-black/20">
                <h4 className="font-semibold text-white mb-2 border-b border-white/10 pb-2">🔍 Extracted Entities</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Names</p>
                    <div className="flex flex-wrap gap-2">
                      {results.entities.names.length > 0 ? results.entities.names.map((n, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-primary/20 text-primary-light text-xs">{n}</span>
                      )) : <span className="text-xs text-gray-600">None found</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Organizations</p>
                    <div className="flex flex-wrap gap-2">
                      {results.entities.organizations.length > 0 ? results.entities.organizations.map((o, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 text-xs">{o}</span>
                      )) : <span className="text-xs text-gray-600">None found</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Dates</p>
                    <div className="flex flex-wrap gap-2">
                      {results.entities.dates.length > 0 ? results.entities.dates.map((d, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs">{d}</span>
                      )) : <span className="text-xs text-gray-600">None found</span>}
                    </div>
                  </div>
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
