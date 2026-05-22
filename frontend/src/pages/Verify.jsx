import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

const Verify = () => {
  const [file, setFile] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [aiResult, setAiResult] = useState(null);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
      setAiResult(null);
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

  const handleVerify = async () => {
    if (!file) return toast.error("Please upload a document first");

    setIsVerifying(true);
    setResult(null);
    setAiResult(null);

    try {
      const formData = new FormData();
      formData.append('document', file);

      // 1. Run AI Analysis
      const aiRes = await api.analyzeForgery(formData);
      if (aiRes.success) {
        setAiResult(aiRes.data);
      }

      // 2. Verify on Blockchain
      const verifyRes = await api.verifyByUpload(formData);
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
        toast.error(verifyRes.error || "Verification failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during verification");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white mb-4">Verify Document Authenticity</h1>
        <p className="text-gray-400">Upload any certificate, degree, or document to instantly verify its origin and check for AI-detected tampering.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div 
            {...getRootProps()} 
            className={`glass-panel border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 ${
              isDragActive ? 'border-primary bg-primary/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'
            }`}
          >
            <input {...getInputProps()} />
            <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-gray-400'}`} />
            </div>
            
            {file ? (
              <div className="space-y-2">
                <File className="w-12 h-12 text-primary mx-auto" />
                <p className="text-white font-medium truncate px-4">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <p className="text-xs text-primary mt-2">Click or drag to replace file</p>
              </div>
            ) : (
              <div>
                <p className="text-lg text-white mb-2">Drag & drop your document here</p>
                <p className="text-sm text-gray-400">or click to browse files</p>
                <p className="text-xs text-gray-500 mt-4">Supports PDF, PNG, JPG (Max 50MB)</p>
              </div>
            )}
          </div>

          <button
            onClick={handleVerify}
            disabled={!file || isVerifying}
            className="btn-primary w-full py-4 text-lg font-semibold flex items-center justify-center space-x-2"
          >
            {isVerifying ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Analyzing & Verifying...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Verify Document</span>
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {(!result && !isVerifying) && (
            <div className="glass-panel h-full flex flex-col items-center justify-center p-10 text-center border-dashed border-2 border-white/10 opacity-50">
              <ShieldCheck className="w-16 h-16 text-gray-600 mb-4" />
              <p className="text-gray-400">Upload a document to see verification results here.</p>
            </div>
          )}

          {isVerifying && (
            <div className="glass-panel p-8 space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Verification in Progress</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-gray-300">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span>Extracting document metadata...</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse animation-delay-500"></div>
                  <span>Running AI forgery detection models...</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse animation-delay-1000"></div>
                  <span>Querying Polygon blockchain...</span>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Blockchain Result */}
              <div className={`glass-panel p-6 border-l-4 ${
                result.verified ? 'border-emerald-500' : 
                result.status === 'REVOKED' ? 'border-yellow-500' : 'border-red-500'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5" />
                      <span>Blockchain Verification</span>
                    </h3>
                    <p className={`text-sm mt-1 font-medium ${
                      result.verified ? 'text-emerald-400' : 
                      result.status === 'REVOKED' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {result.message}
                    </p>
                  </div>
                  {result.verified ? (
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  ) : result.status === 'REVOKED' ? (
                    <AlertTriangle className="w-10 h-10 text-yellow-500" />
                  ) : (
                    <XCircle className="w-10 h-10 text-red-500" />
                  )}
                </div>

                {result.verified && result.data && (
                  <div className="mt-6 space-y-3 bg-black/30 rounded-xl p-4">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-gray-500">Issuer:</span>
                      <span className="text-white col-span-2 font-medium">{result.data.issuerName || result.data.issuer}</span>
                      
                      <span className="text-gray-500">Issued To:</span>
                      <span className="text-white col-span-2 font-mono text-xs break-all">{result.data.owner}</span>
                      
                      <span className="text-gray-500">Doc Type:</span>
                      <span className="text-white col-span-2 capitalize">{result.data.documentType}</span>
                      
                      <span className="text-gray-500">Date Issued:</span>
                      <span className="text-white col-span-2">{new Date(result.data.timestamp * 1000).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Analysis Result */}
              {aiResult && (
                <div className={`glass-panel p-6 border-l-4 ${
                  aiResult.isAuthentic ? 'border-blue-500' : 'border-red-500'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                        <Cpu className="w-5 h-5" />
                        <span>AI Forgery Detection</span>
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">Deep analysis of file structure and metadata</p>
                    </div>
                    <div className={`text-2xl font-bold ${aiResult.isAuthentic ? 'text-blue-400' : 'text-red-400'}`}>
                      {aiResult.confidenceScore}%
                      <span className="block text-xs text-gray-500 font-normal text-right">Confidence</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {aiResult.analyses.map((analysis, idx) => {
                      // Only show findings that have issues (severity != info)
                      const issues = analysis.findings.filter(f => f.severity !== 'info');
                      if (issues.length === 0) return null;

                      return (
                        <div key={idx} className="bg-black/30 rounded-lg p-3 text-sm border border-red-500/20">
                          <p className="font-medium text-white mb-1">{analysis.description}</p>
                          <ul className="list-disc pl-5 space-y-1">
                            {issues.map((issue, i) => (
                              <li key={i} className="text-red-400">{issue.message}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}

                    {aiResult.analyses.every(a => a.findings.every(f => f.severity === 'info')) && (
                      <div className="bg-blue-500/10 rounded-lg p-3 text-sm text-blue-400 border border-blue-500/20 flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>No signs of digital tampering detected. Structure and metadata are clean.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Verify;
