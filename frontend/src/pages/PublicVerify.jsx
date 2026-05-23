import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, Cpu, ArrowLeft, HelpCircle, CheckCircle, 
  XCircle, AlertTriangle, FileText, History, ExternalLink, Sparkles 
} from 'lucide-react';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

const PublicVerify = () => {
  const { hash } = useParams();
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredBox, setHoveredBox] = useState(null);

  useEffect(() => {
    const runVerification = async () => {
      setIsLoading(true);
      try {
        console.log("Running public verification for hash:", hash);
        const verifyRes = await api.verifyByHash(hash);
        
        if (verifyRes.success) {
          setResult(verifyRes);
          if (verifyRes.verified) {
            toast.success("Document verified successfully!");
          } else if (verifyRes.status === "REVOKED") {
            toast.error("Warning: This document has been revoked by the issuer");
          } else {
            toast.error("Document not found on the blockchain");
          }
        } else {
          toast.error(verifyRes.error || "Verification query failed");
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to fetch public verification record");
      } finally {
        setIsLoading(false);
      }
    };

    if (hash) {
      runVerification();
    }
  }, [hash]);

  const renderGauge = (score) => {
    const radius = 45;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    
    let colorClass = "stroke-red-500";
    if (score > 75) colorClass = "stroke-emerald-500";
    else if (score > 40) colorClass = "stroke-yellow-500";

    return (
      <div className="relative w-28 h-28 flex items-center justify-center mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="56" cy="56" r={radius} className="stroke-white/5 fill-none" strokeWidth={strokeWidth} />
          <circle 
            cx="56" cy="56" r={radius} 
            className={`fill-none transition-all duration-1000 ease-out ${colorClass}`} 
            strokeWidth={strokeWidth} 
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-black text-white">{score}%</span>
          <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold mt-0.5">Trust</span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="glass-panel p-12 max-w-md mx-auto border border-white/10">
          <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">Decrypting IPFS Ledger</h3>
          <p className="text-sm text-gray-400">Querying smart contract and scanning visual signatures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      
      {/* Header and Go Back */}
      <div className="mb-8">
        <Link 
          to="/verify" 
          className="inline-flex items-center space-x-1 text-sm text-gray-400 hover:text-white transition-all bg-white/5 border border-white/10 px-4 py-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Portal Verification Center</span>
        </Link>
      </div>

      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-xxs font-semibold text-primary mb-4 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Public Audit Certificate</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">EVM Blockchain Report</h1>
        <p className="text-xs text-gray-400 font-mono break-all bg-black/40 p-2.5 rounded-lg border border-white/5 max-w-xl mx-auto">
          Hash: {hash}
        </p>
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Visual Overlay Heatmap (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-1.5 pb-2 border-b border-white/5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>E2E IPFS Visual Audit Map</span>
              </h3>

              {/* Bounding Box Container */}
              <div className="relative border border-white/10 rounded-2xl overflow-hidden bg-black/60 flex items-center justify-center min-h-[400px]">
                {/* PDF/Doc structure mock view */}
                <div className="relative w-[320px] h-[420px] bg-white p-5 rounded-xl shadow-2xl flex flex-col justify-between border border-gray-200 text-gray-800">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b pb-3 border-gray-100">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="space-y-1.5 flex-grow ml-3">
                        <div className="w-24 h-3 bg-gray-300 rounded"></div>
                        <div className="w-12 h-2 bg-gray-200 rounded"></div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3">
                      <div className="w-full h-2 bg-gray-100 rounded"></div>
                      <div className="w-full h-2 bg-gray-100 rounded"></div>
                      <div className="w-5/6 h-2 bg-gray-100 rounded"></div>
                      <div className="w-4/5 h-2 bg-gray-100 rounded"></div>
                    </div>

                    <div className="space-y-2 pt-6">
                      <div className="w-full h-2 bg-gray-100 rounded"></div>
                      <div className="w-3/4 h-2 bg-gray-100 rounded"></div>
                    </div>

                    <div className="flex justify-between pt-12">
                      <div className="space-y-1">
                        <div className="w-16 h-1.5 bg-gray-200 rounded"></div>
                        <div className="w-8 h-1 bg-gray-100 rounded"></div>
                      </div>
                      <div className="w-12 h-8 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                        <div className="w-8 h-4 bg-gray-200 rounded-sm"></div>
                      </div>
                    </div>
                  </div>

                  {/* Overlays mapping */}
                  {result.aiAnalysis?.tamperedAreas?.map((box) => (
                    <div
                      key={box.id}
                      onMouseEnter={() => setHoveredBox(box)}
                      onMouseLeave={() => setHoveredBox(null)}
                      style={{
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.width}%`,
                        height: `${box.height}%`,
                      }}
                      className="absolute border-2 border-dashed bg-red-500/10 border-red-500 hover:bg-red-500/25 transition-all cursor-help flex items-center justify-center animate-pulse"
                    >
                      <span className="text-[9px] font-bold text-white bg-red-600 px-1 rounded-sm shadow-md">
                        {box.id}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Hover box tooltip details */}
                {hoveredBox ? (
                  <div className="absolute bottom-4 left-4 right-4 bg-red-950/90 border border-red-500/30 p-3 rounded-xl shadow-2xl flex items-start space-x-2.5 backdrop-blur-md">
                    <ShieldCheck className="w-4.5 h-4.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-0.5">
                        Tamper Point #{hoveredBox.id} ({hoveredBox.type})
                      </h4>
                      <p className="text-xxs text-gray-300 leading-normal">{hoveredBox.label}</p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute bottom-4 text-center">
                    <p className="text-[9px] text-gray-500 bg-black/80 px-2.5 py-1 rounded-full border border-white/5">
                      Hover red overlay indicators to investigate anomalies
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Analyses findings breakdown */}
            {result.aiAnalysis && (
              <div className="glass-panel p-6 border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <Cpu className="w-4.5 h-4.5 text-primary" />
                  <span>AI Structural Verification Findings</span>
                </h3>
                
                <div className="space-y-3">
                  {result.aiAnalysis.analyses.map((analysis, idx) => {
                    const hasIssues = analysis.findings.some(f => f.severity !== 'info');
                    return (
                      <div 
                        key={idx} 
                        className={`p-3.5 rounded-xl border ${
                          hasIssues ? 'bg-red-500/5 border-red-500/10' : 'bg-white/2 border-white/5'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <h4 className="text-[11px] font-bold text-white uppercase">{analysis.description}</h4>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            analysis.riskScore > 0.5 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            Risk: {Math.round(analysis.riskScore * 100)}%
                          </span>
                        </div>
                        <ul className="space-y-1 text-xxs text-gray-400 pl-4 list-disc">
                          {analysis.findings.map((f, i) => (
                            <li key={i} className={f.severity !== 'info' ? 'text-red-400/90' : ''}>
                              {f.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Rating, Issuer details, audit trail (1 Col) */}
          <div className="space-y-6">
            
            {/* Rating card */}
            <div className="glass-panel p-6 border border-white/10 text-center space-y-6">
              <h3 className="text-sm font-bold text-white border-b border-white/5 pb-3 uppercase tracking-wider">
                Credential Security Rating
              </h3>
              
              {renderGauge(result.trustScore)}

              <div className="space-y-2 pt-2 text-xxs">
                <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-white/5">
                  <span className="text-gray-400">EVM Ledger integrity</span>
                  <span className={`font-semibold ${result.breakdown.blockchainIntegrity === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result.breakdown.blockchainIntegrity}%
                  </span>
                </div>
                <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-white/5">
                  <span className="text-gray-400">AI Visual clearance</span>
                  <span className="text-primary font-semibold">
                    {result.breakdown.aiConfidence}%
                  </span>
                </div>
              </div>

              <div className={`p-4 rounded-xl border text-center font-sans ${
                result.status === 'AUTHENTIC' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                result.status === 'REVOKED' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                <span className="text-[9px] uppercase font-bold tracking-widest block mb-1">EVM Status</span>
                <span className="text-base font-black">{result.status}</span>
              </div>
            </div>

            {/* Issuer Registry Details */}
            {result.data && result.data.issuer && (
              <div className="glass-panel p-6 border border-white/10 space-y-4">
                <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Credential Registry Details</span>
                </h3>
                
                <div className="space-y-3 text-xxs font-mono">
                  <div className="bg-black/50 p-2.5 rounded border border-white/5">
                    <span className="text-gray-500 block mb-0.5">Issuer Name</span>
                    <span className="text-white font-sans font-semibold">{result.data.issuerName || 'Unknown Issuer'}</span>
                  </div>
                  <div className="bg-black/50 p-2.5 rounded border border-white/5">
                    <span className="text-gray-500 block mb-0.5">Issuer Address</span>
                    <span className="text-gray-300 truncate block" title={result.data.issuer}>{result.data.issuer}</span>
                  </div>
                  <div className="bg-black/50 p-2.5 rounded border border-white/5">
                    <span className="text-gray-500 block mb-0.5">Secure IPFS CID</span>
                    <a 
                      href={`http://localhost:5001/api/documents/ipfs/${result.data.ipfsHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:text-primary-light block truncate font-sans font-semibold flex items-center space-x-1"
                    >
                      <span className="truncate">{result.data.ipfsHash}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                  <div className="bg-black/50 p-2.5 rounded border border-white/5">
                    <span className="text-gray-500 block mb-0.5">Document Class</span>
                    <span className="text-gray-300 capitalize">{result.data.documentType}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Trail Timeline */}
            <div className="glass-panel p-6 border border-white/10 space-y-4">
              <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <History className="w-4 h-4 text-primary" />
                <span>Verification Audit Timeline</span>
              </h3>
              
              {result.historyLogs && result.historyLogs.length > 0 ? (
                <div className="relative pl-5 space-y-4 border-l border-white/10 ml-2 py-1">
                  {result.historyLogs.map((log, idx) => (
                    <div key={idx} className="relative">
                      <span className={`absolute -left-[25px] top-0.5 w-2 h-2 rounded-full border ${
                        log.isAuthentic ? 'bg-emerald-500 border-emerald-400' : 'bg-red-500 border-red-400'
                      }`} />
                      <div className="text-[10px] text-gray-400">
                        <p className="font-semibold text-white">
                          Verified by {log.verifier.slice(0, 6)}...{log.verifier.slice(-4)}
                        </p>
                        <p className="text-[9px] text-gray-500 font-mono mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-black/30 border border-dashed border-white/5 rounded-lg text-[10px] text-gray-500">
                  No historical verification logs recorded.
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default PublicVerify;
