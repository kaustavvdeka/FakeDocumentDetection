import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, File, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Cpu, 
  Search, QrCode, ExternalLink, ShieldAlert, FileText, History, Info, Sparkles 
} from 'lucide-react';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

const Verify = () => {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [hashInput, setHashInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [hoveredBox, setHoveredBox] = useState(null);
  
  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setResult(null);
      setHashInput('');
      
      // Generate preview for images
      if (selectedFile.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(selectedFile));
      } else {
        setFilePreview(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    }
  });

  // Verify Document File Upload
  const handleVerifyFile = async (recordLog = false) => {
    if (!file) return toast.error("Please upload a document first");

    setIsVerifying(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('recordLog', recordLog);

      const verifyRes = await api.verifyByUpload(formData);
      
      if (verifyRes.success) {
        setResult(verifyRes);
        if (verifyRes.verified) {
          toast.success("Credential successfully verified on blockchain!");
        } else if (verifyRes.status === "REVOKED") {
          toast.error("Security Warning: This credential has been revoked.");
        } else {
          toast.error("Registry Status: Unregistered document.");
        }
      } else {
        toast.error(verifyRes.error || "Verification scan failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during verification scan");
    } finally {
      setIsVerifying(false);
    }
  };

  // Verify by SHA-256 Hash
  const handleVerifyHash = async (e) => {
    if (e) e.preventDefault();
    if (!hashInput.trim()) return toast.error("Please enter a document hash");
    
    setIsVerifying(true);
    setResult(null);
    setFile(null);
    setFilePreview(null);

    try {
      const verifyRes = await api.verifyByHash(hashInput.trim());
      
      if (verifyRes.success) {
        setResult(verifyRes);
        if (verifyRes.verified) {
          toast.success("Hash successfully verified on blockchain!");
        } else if (verifyRes.status === "REVOKED") {
          toast.error("Security Warning: This credential has been revoked.");
        } else {
          toast.error("Registry Status: Unregistered hash.");
        }
      } else {
        toast.error(verifyRes.error || "Hash verification failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during verification query");
    } finally {
      setIsVerifying(false);
    }
  };

  // Render SVG Radial Trust Score Gauge
  const renderGauge = (score) => {
    const radius = 50;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    
    let colorClass = "stroke-red-500";
    if (score > 75) colorClass = "stroke-emerald-500";
    else if (score > 40) colorClass = "stroke-yellow-500";

    return (
      <div className="relative w-36 h-36 flex items-center justify-center mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle 
            cx="72" cy="72" r={radius} 
            className="stroke-white/5 fill-none" 
            strokeWidth={strokeWidth} 
          />
          <circle 
            cx="72" cy="72" r={radius} 
            className={`fill-none transition-all duration-1000 ease-out ${colorClass}`} 
            strokeWidth={strokeWidth} 
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-extrabold text-white">{score}%</span>
          <span className="text-xxs uppercase tracking-wider text-gray-400 font-semibold mt-0.5">Trust Score</span>
        </div>
      </div>
    );
  };

  // Generate public verification link
  const getPublicVerificationUrl = () => {
    if (!result || !result.data || !result.data.documentHash) return "";
    const cleanHash = result.data.documentHash;
    return `${window.location.origin}/verify/public/${cleanHash}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      
      {/* Welcome Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight flex items-center justify-center space-x-3">
          <ShieldCheck className="w-9 h-9 text-primary" />
          <span>Multi-Layer Verification Portal</span>
        </h1>
        <p className="text-gray-400">
          Validate document authenticity instantly. Paste a registry hash or upload a credential file to cross-examine cryptographic blockchain signatures and visual manipulation heatmaps.
        </p>
      </div>

      {/* Input Operations Container */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
        
        {/* Upload File Zone (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-primary" />
              <span>Verify by Document Attachment</span>
            </h3>

            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                isDragActive ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/25 hover:bg-white/5 bg-black/40'
              }`}
            >
              <input {...getInputProps()} />
              
              {file ? (
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center mx-auto">
                    <File className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-white font-semibold truncate max-w-sm mx-auto">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p className="text-xxs text-primary font-medium">Click or drag files here to replace</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3 animate-pulse" />
                  <p className="text-white font-medium mb-1">Drag & drop document file here</p>
                  <p className="text-xs text-gray-500">Supports PDF, PNG, JPG (Max 50MB)</p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => handleVerifyFile(false)}
                disabled={!file || isVerifying}
                className="btn-primary flex-grow py-3.5 text-sm font-bold flex items-center justify-center space-x-2"
              >
                <span>Run Standard Scan</span>
              </button>
              <button
                onClick={() => handleVerifyFile(true)}
                disabled={!file || isVerifying}
                className="btn-secondary py-3.5 px-6 text-sm font-bold border border-white/10 flex items-center space-x-2 hover:bg-white/5"
                title="Write verification log to blockchain ledger"
              >
                <span>Record On-Chain Audit Log</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Hash Bar (2 Cols) */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-6 border border-white/10 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Search className="w-5 h-5 text-primary" />
                <span>Verify by SHA-256 Hash</span>
              </h3>
              <p className="text-xs text-gray-400">
                Lookup credential details directly if you only have the cryptographic hash. The portal will automatically search the blockchain and pull IPFS payloads for visual fraud scanning.
              </p>
              
              <form onSubmit={handleVerifyHash} className="space-y-3">
                <input 
                  type="text"
                  placeholder="Enter 64-character SHA-256 hash (0x...)"
                  value={hashInput}
                  onChange={(e) => setHashInput(e.target.value)}
                  className="input-field py-3 text-xs font-mono"
                  required
                />
                <button
                  type="submit"
                  disabled={!hashInput.trim() || isVerifying}
                  className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Lookup Hash Registry</span>
                </button>
              </form>
            </div>

            <div className="bg-white/2 p-3 rounded-lg border border-white/5 text-[11px] text-gray-500 mt-4">
              <Info className="w-3.5 h-3.5 inline mr-1.5 align-text-bottom text-primary" />
              <span>Checking a hash does not cost gas unless an on-chain audit log is explicitly requested.</span>
            </div>
          </div>
        </div>

      </div>

      {/* Loading Overlay */}
      {isVerifying && (
        <div className="glass-panel p-12 text-center border border-white/10 animate-pulse max-w-lg mx-auto">
          <Cpu className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
          <h4 className="text-lg font-bold text-white mb-2">Analyzing Credential Integrity</h4>
          <p className="text-sm text-gray-400">Performing visual block analysis, hashing buffers, and querying EVM blockchain state...</p>
        </div>
      )}

      {/* SCAN RESULTS DISPLAY PANELS */}
      {result && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in-up">
          
          {/* Column 1: Document Visual Heatmap Overlay Map */}
          <div className="xl:col-span-2 space-y-6">
            <div className="glass-panel p-6 border border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="text-md font-bold text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-primary animate-bounce" />
                  <span>Interactive AI Forgery Heatmap</span>
                </h3>
                <span className="text-xxs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-semibold">
                  Visual Audit Map
                </span>
              </div>

              {/* Bounding Box Container */}
              <div className="relative border border-white/10 rounded-2xl overflow-hidden bg-black/60 flex items-center justify-center min-h-[450px]">
                {filePreview ? (
                  <div className="relative max-w-full max-h-[500px]">
                    <img 
                      src={filePreview} 
                      alt="Verified File Document" 
                      className="max-h-[500px] object-contain opacity-90 rounded-lg" 
                    />
                    
                    {/* Bounding boxes overlays */}
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
                        className={`absolute border-2 border-dashed bg-red-500/10 border-red-500 hover:bg-red-500/25 transition-all duration-200 cursor-help flex items-center justify-center animate-pulse`}
                      >
                        <span className="text-[10px] font-bold text-white bg-red-600 px-1 rounded-sm shadow-md">
                          {box.id}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Stylized PDF document mock overlay map
                  <div className="relative w-[340px] h-[450px] bg-white p-6 rounded-xl shadow-2xl flex flex-col justify-between border border-gray-200 text-gray-800">
                    <div className="space-y-4">
                      {/* Document Header Mock */}
                      <div className="flex justify-between items-center border-b pb-4 border-gray-100">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="space-y-1.5 flex-grow ml-3">
                          <div className="w-28 h-3.5 bg-gray-300 rounded"></div>
                          <div className="w-16 h-2 bg-gray-200 rounded"></div>
                        </div>
                      </div>

                      {/* Mock Text Paragraph Lines */}
                      <div className="space-y-2.5 pt-4">
                        <div className="w-full h-2.5 bg-gray-100 rounded"></div>
                        <div className="w-full h-2.5 bg-gray-100 rounded"></div>
                        <div className="w-5/6 h-2.5 bg-gray-100 rounded"></div>
                        <div className="w-4/5 h-2.5 bg-gray-100 rounded"></div>
                      </div>

                      <div className="space-y-2.5 pt-8">
                        <div className="w-full h-2.5 bg-gray-100 rounded"></div>
                        <div className="w-3/4 h-2.5 bg-gray-100 rounded"></div>
                      </div>

                      {/* Mock stamp/signature footer */}
                      <div className="flex justify-between pt-12">
                        <div className="space-y-1.5">
                          <div className="w-20 h-2 bg-gray-200 rounded"></div>
                          <div className="w-12 h-1.5 bg-gray-100 rounded"></div>
                        </div>
                        <div className="w-16 h-12 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                          <div className="w-10 h-6 bg-gray-200 rounded-sm"></div>
                        </div>
                      </div>
                    </div>

                    {/* PDF Bounding boxes overlays */}
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
                        className={`absolute border-2 border-dashed bg-red-500/10 border-red-500 hover:bg-red-500/25 transition-all duration-200 cursor-help flex items-center justify-center animate-pulse`}
                      >
                        <span className="text-[10px] font-bold text-white bg-red-600 px-1 rounded-sm shadow-md">
                          {box.id}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hover Box Detailed Card Overlay */}
                {hoveredBox ? (
                  <div className="absolute bottom-4 left-4 right-4 bg-red-950/90 border border-red-500/30 p-3.5 rounded-xl shadow-2xl flex items-start space-x-3 backdrop-blur-md">
                    <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0 animate-bounce" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-0.5">
                        Tamper Spot #{hoveredBox.id} ({hoveredBox.type})
                      </h4>
                      <p className="text-xs text-gray-300 leading-normal">{hoveredBox.label}</p>
                      <div className="mt-1 flex items-center space-x-2 text-[10px]">
                        <span className="text-red-400 font-semibold">Risk Probability:</span>
                        <span className="bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-mono">
                          {Math.round(hoveredBox.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute bottom-4 text-center">
                    <p className="text-[10px] text-gray-500 bg-black/80 px-3 py-1.5 rounded-full border border-white/5">
                      Hover over red highlighted regions to examine fraud details
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Fraud findings breakdown details */}
            {result.aiAnalysis && (
              <div className="glass-panel p-6 border border-white/10 space-y-4">
                <h3 className="text-md font-bold text-white flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-primary" />
                  <span>Linguistic & Visual Anomaly Report</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.aiAnalysis.analyses.map((analysis, idx) => {
                    const hasIssues = analysis.findings.some(f => f.severity !== 'info');
                    
                    return (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-xl border transition-all ${
                          hasIssues 
                            ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/30' 
                            : 'bg-white/2 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{analysis.description}</h4>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            analysis.riskScore > 0.6 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            analysis.riskScore > 0.2 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            Score: {Math.round(analysis.riskScore * 100)}%
                          </span>
                        </div>
                        
                        <ul className="space-y-1.5 text-xs text-gray-400">
                          {analysis.findings.map((f, i) => (
                            <li key={i} className="flex items-start space-x-2">
                              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                                f.severity === 'critical' || f.severity === 'high' ? 'bg-red-500' :
                                f.severity === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'
                              }`} />
                              <p className={f.severity !== 'info' ? 'text-red-400/90' : ''}>{f.message}</p>
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

          {/* Column 2: Trust score circular gauge, QR code, Ledger audit logs (1 Col) */}
          <div className="space-y-6">
            
            {/* Trust rating gauge card */}
            <div className="glass-panel p-6 border border-white/10 text-center space-y-6">
              <h3 className="text-md font-bold text-white border-b border-white/5 pb-3">
                Aggregate Trust Rating
              </h3>
              
              {renderGauge(result.trustScore)}

              <div className="space-y-3 pt-2 text-xs">
                {/* Blockchain Integrity */}
                <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-white/5">
                  <span className="text-gray-400">EVM Ledger Integrity</span>
                  <span className={`font-semibold font-mono ${result.breakdown.blockchainIntegrity === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result.breakdown.blockchainIntegrity}%
                  </span>
                </div>
                
                {/* AI Forgery Clearance */}
                <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-white/5">
                  <span className="text-gray-400">AI Visual Clearance</span>
                  <span className="text-primary font-semibold font-mono">
                    {result.breakdown.aiConfidence}%
                  </span>
                </div>
              </div>

              {/* Status Header Block */}
              <div className={`p-4 rounded-xl border text-center ${
                result.status === 'AUTHENTIC' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                result.status === 'REVOKED' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                <span className="text-[10px] uppercase font-bold tracking-widest block mb-1">Audit Status</span>
                <span className="text-lg font-black">{result.status}</span>
              </div>
            </div>

            {/* Live QR Code verification */}
            {result.verified && result.data && (
              <div className="glass-panel p-6 border border-white/10 text-center space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center justify-center space-x-1.5">
                  <QrCode className="w-4.5 h-4.5 text-primary" />
                  <span>Public QR Verification</span>
                </h3>
                <p className="text-xxs text-gray-400 max-w-[200px] mx-auto leading-normal">
                  Scan this QR code to view this certificate's public verification page on mobile devices.
                </p>
                <div className="bg-white p-3 rounded-2xl inline-block shadow-2xl">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(getPublicVerificationUrl())}`} 
                    alt="Verification QR code" 
                    className="w-[130px] h-[130px]"
                  />
                </div>
                <div>
                  <a 
                    href={getPublicVerificationUrl()} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-xs text-primary hover:text-primary-light font-semibold mt-1"
                  >
                    <span>View Public Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Document Metadata Ledger */}
            {result.data && result.data.issuer && (
              <div className="glass-panel p-6 border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <FileText className="w-4.5 h-4.5 text-primary" />
                  <span>Document Registry Details</span>
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
              <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <History className="w-4.5 h-4.5 text-primary" />
                <span>On-Chain Verification Audit Trail</span>
              </h3>
              
              {result.historyLogs && result.historyLogs.length > 0 ? (
                <div className="relative pl-5 space-y-4 border-l border-white/10 ml-2 py-1">
                  {result.historyLogs.map((log, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[25px] top-0.5 w-2.5 h-2.5 rounded-full border ${
                        log.isAuthentic ? 'bg-emerald-500 border-emerald-400' : 'bg-red-500 border-red-400'
                      }`} />
                      <div className="text-[10px] text-gray-400 leading-normal">
                        <p className="font-semibold text-white font-sans">
                          Verified by {log.verifier.slice(0, 6)}...{log.verifier.slice(-4)}
                        </p>
                        <p className="text-[9px] text-gray-500 font-mono mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                        <p className={`font-semibold mt-0.5 ${log.isAuthentic ? 'text-emerald-400' : 'text-red-400'}`}>
                          {log.isAuthentic ? 'AUTHENTIC CONFIRMATION' : 'VERIFICATION WARNING'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-black/30 border border-dashed border-white/5 rounded-lg text-xxs text-gray-500">
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

export default Verify;
