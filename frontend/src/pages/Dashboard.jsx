import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useWeb3 } from '../context/Web3Context';
import { 
  Upload, File, LayoutDashboard, Send, ShieldPlus, FileText, CheckCircle2, 
  Layers, Settings, History, HelpCircle, UserCheck, RefreshCw, X, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

import deploymentConfig from '../contracts/deploymentConfig.json';
import ProofChainABI from '../contracts/ProofChainABI.json';

const Dashboard = () => {
  const { account, signer, isConnecting, connectWallet } = useWeb3();
  const [activeTab, setActiveTab] = useState('single'); // 'single', 'batch', 'history'

  // Single Upload State
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    ownerAddress: '',
    documentType: 'degree',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Batch Upload State
  const [batchFiles, setBatchFiles] = useState([]); // Array of { id, file, ownerAddress, documentType }
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [batchSuccessData, setBatchSuccessData] = useState(null);
  const [batchApplyAll, setBatchApplyAll] = useState({
    ownerAddress: '',
    documentType: 'degree'
  });

  // History State
  const [issuedDocs, setIssuedDocs] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch Issuer History from Smart Contract
  const fetchIssuerHistory = useCallback(async () => {
    if (!account || !signer) return;
    setIsLoadingHistory(true);
    try {
      const contractAddress = deploymentConfig.contracts.ProofChain;
      const contract = new ethers.Contract(contractAddress, ProofChainABI, signer);
      
      console.log("Fetching issued documents for:", account);
      const hashes = await contract.getIssuerDocuments(account);
      
      const docs = [];
      for (const hash of hashes) {
        try {
          const doc = await contract.getDocument(hash);
          docs.push({
            documentHash: doc.documentHash,
            issuer: doc.issuer,
            owner: doc.owner,
            timestamp: Number(doc.timestamp),
            ipfsHash: doc.ipfsHash,
            documentType: doc.documentType,
            issuerName: doc.issuerName,
            isRevoked: doc.isRevoked,
          });
        } catch (e) {
          console.warn("Error resolving hash details:", hash, e);
        }
      }
      
      // Sort by newest first
      docs.sort((a, b) => b.timestamp - a.timestamp);
      setIssuedDocs(docs);
    } catch (error) {
      console.error("Failed to fetch history from contract:", error);
      toast.error("Could not fetch registration history from blockchain.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [account, signer]);

  useEffect(() => {
    if (account && signer) {
      fetchIssuerHistory();
    }
  }, [account, signer, fetchIssuerHistory]);

  // Dropzone for Single Document
  const onDropSingle = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { 
    getRootProps: getRootPropsSingle, 
    getInputProps: getInputPropsSingle, 
    isDragActive: isDragActiveSingle 
  } = useDropzone({
    onDrop: onDropSingle,
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    }
  });

  // Dropzone for Batch Documents
  const onDropBatch = useCallback(acceptedFiles => {
    const formatted = acceptedFiles.map((file, idx) => ({
      id: Date.now() + idx + Math.random(),
      file,
      ownerAddress: '',
      documentType: 'degree'
    }));
    setBatchFiles(prev => [...prev, ...formatted]);
  }, []);

  const { 
    getRootProps: getRootPropsBatch, 
    getInputProps: getInputPropsBatch, 
    isDragActive: isDragActiveBatch 
  } = useDropzone({
    onDrop: onDropBatch,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    }
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBatchFileChange = (id, field, value) => {
    setBatchFiles(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const removeBatchFile = (id) => {
    setBatchFiles(prev => prev.filter(item => item.id !== id));
  };

  const applyToAllBatch = () => {
    if (batchFiles.length === 0) return toast.error("No files in the batch list");
    setBatchFiles(prev => prev.map(item => ({
      ...item,
      ownerAddress: batchApplyAll.ownerAddress || item.ownerAddress,
      documentType: batchApplyAll.documentType
    })));
    toast.success("Applied settings to all files");
  };

  // Submit Single Credentials
  const handleSubmitSingle = async (e) => {
    e.preventDefault();
    if (!account) return toast.error("Please connect your wallet first");
    if (!file) return toast.error("Please upload a document");
    if (!formData.ownerAddress) return toast.error("Please enter the recipient's wallet address");
    if (!ethers.isAddress(formData.ownerAddress)) return toast.error("Invalid recipient wallet address format");

    setIsSubmitting(true);
    setSuccessData(null);

    try {
      const submitData = new FormData();
      submitData.append('document', file);
      submitData.append('ownerAddress', formData.ownerAddress);
      submitData.append('documentType', formData.documentType);
      
      const res = await api.registerDocument(submitData);
      
      if (res.success) {
        toast.success("Document successfully registered on blockchain & IPFS!");
        setSuccessData(res.data);
        setFile(null);
        setFormData({ ownerAddress: '', documentType: 'degree' });
        fetchIssuerHistory(); // Refresh history
      } else {
        toast.error(res.error || "Failed to register document");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during registration");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Batch Credentials
  const handleSubmitBatch = async (e) => {
    e.preventDefault();
    if (!account) return toast.error("Please connect your wallet first");
    if (batchFiles.length === 0) return toast.error("Upload at least one document");
    
    // Check if any fields are empty or invalid
    const invalidItem = batchFiles.find(item => !item.ownerAddress || !ethers.isAddress(item.ownerAddress));
    if (invalidItem) {
      return toast.error("Please provide valid wallet addresses for all documents");
    }

    setIsBatchSubmitting(true);
    setBatchSuccessData(null);

    try {
      const submitData = new FormData();
      
      // Append files and arrays
      batchFiles.forEach(item => {
        submitData.append('documents', item.file);
      });
      submitData.append('owners', batchFiles.map(item => item.ownerAddress).join(','));
      submitData.append('documentTypes', batchFiles.map(item => item.documentType).join(','));

      const res = await api.registerDocumentBatch(submitData);

      if (res.success) {
        toast.success(`Successfully registered ${res.registeredCount} credentials!`);
        setBatchSuccessData(res);
        setBatchFiles([]);
        fetchIssuerHistory();
      } else {
        toast.error(res.error || "Batch registration failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during batch registration");
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  // Revoke Document on Blockchain
  const handleRevoke = async (documentHash) => {
    if (!signer) return;
    const confirm = window.confirm("Are you absolutely sure you want to revoke this document? This action is irreversible on the blockchain.");
    if (!confirm) return;

    const toastId = toast.loading("Processing on-chain revocation...");
    try {
      const contractAddress = deploymentConfig.contracts.ProofChain;
      const contract = new ethers.Contract(contractAddress, ProofChainABI, signer);
      
      const tx = await contract.revokeDocument(documentHash);
      await tx.wait();
      
      toast.success("Document revoked successfully!", { id: toastId });
      fetchIssuerHistory();
    } catch (error) {
      console.error("Revocation failed:", error);
      toast.error(error.reason || "Revocation transaction failed", { id: toastId });
    }
  };

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="glass-panel p-12 max-w-lg mx-auto border border-white/10">
          <div className="bg-primary/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <LayoutDashboard className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Issuer Portal Access</h2>
          <p className="text-gray-400 mb-8">Please connect your authorized institution wallet to issue secure credentials and manage verification audits.</p>
          <button 
            onClick={connectWallet}
            disabled={isConnecting}
            className="btn-primary w-full py-4 text-lg font-bold flex items-center justify-center space-x-2"
          >
            {isConnecting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Connecting MetaMask...</span>
              </>
            ) : (
              <span>Connect Wallet</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Top Welcome Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            <span>Enterprise Issuer Portal</span>
          </h1>
          <p className="text-gray-400">Issue secure credentials, perform multi-file batch operations, and audit cryptographic registries.</p>
        </div>
        <div className="mt-4 lg:mt-0 flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-mono text-gray-300">
              Connected: {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex space-x-2 mb-8 bg-black/40 p-1.5 rounded-xl border border-white/5 w-fit">
        <button 
          onClick={() => setActiveTab('single')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'single' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          <ShieldPlus className="w-4 h-4" />
          <span>Single Issuance</span>
        </button>
        <button 
          onClick={() => setActiveTab('batch')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'batch' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Batch Credentials</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'history' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Registry Ledger</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Left Side Forms (3 Cols) */}
        <div className="xl:col-span-3 space-y-6">

          {/* TAB 1: SINGLE CREDENTIAL */}
          {activeTab === 'single' && (
            <div className="space-y-6">
              <form onSubmit={handleSubmitSingle} className="glass-panel p-8 space-y-6 border border-white/10">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2 pb-4 border-b border-white/5">
                  <ShieldPlus className="w-5.5 h-5.5 text-primary" />
                  <span>Issue Single Document</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Document Type
                    </label>
                    <select 
                      name="documentType"
                      value={formData.documentType}
                      onChange={handleInputChange}
                      className="input-field bg-black/50"
                    >
                      <option value="degree">University Degree</option>
                      <option value="diploma">Diploma</option>
                      <option value="certificate">Internship Certificate</option>
                      <option value="transcript">Academic Transcript</option>
                      <option value="id_proof">Identity Proof</option>
                      <option value="medical">Medical Record</option>
                      <option value="legal">Legal Document</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Recipient EVM Wallet Address
                    </label>
                    <input 
                      type="text" 
                      name="ownerAddress"
                      value={formData.ownerAddress}
                      onChange={handleInputChange}
                      placeholder="0x..."
                      className="input-field font-mono text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Document File Attachment
                  </label>
                  <div 
                    {...getRootPropsSingle()} 
                    className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                      isDragActiveSingle ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5 bg-black/40'
                    }`}
                  >
                    <input {...getInputPropsSingle()} />
                    {file ? (
                      <div className="space-y-3">
                        <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center mx-auto">
                          <File className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-white font-semibold truncate max-w-md mx-auto">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3 animate-pulse" />
                        <p className="text-white font-medium mb-1">Drag & drop your document file here</p>
                        <p className="text-xs text-gray-500">Accepts PDF, PNG, JPG (Max 50MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !file}
                    className="btn-primary w-full py-4 text-lg font-bold flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Encrypting & Registering on Blockchain...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Issue on Blockchain</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {successData && (
                <div className="glass-panel p-6 border border-emerald-500/20 bg-emerald-500/5 animate-fade-in-up">
                  <div className="flex items-center space-x-3 mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <div>
                      <h3 className="text-xl font-bold text-white">Credential Registered Successfully</h3>
                      <p className="text-xs text-emerald-400/80">Transaction verified on-chain.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 text-sm font-mono">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-500 mb-1 font-sans">Etherscan Tx Hash</p>
                        <p className="text-gray-300 text-xs break-all bg-black/50 p-2.5 rounded-lg border border-white/5">
                          {successData.transactionHash}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1 font-sans">Document SHA-256 Hash</p>
                        <p className="text-gray-300 text-xs break-all bg-black/50 p-2.5 rounded-lg border border-white/5">
                          {successData.documentHash}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-gray-500 mb-1 font-sans">Secure IPFS CID</p>
                        <p className="text-primary text-xs truncate bg-black/50 p-2.5 rounded-lg border border-white/5">
                          {successData.ipfsHash}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1 font-sans">Recipient Owner</p>
                        <p className="text-gray-300 text-xs truncate bg-black/50 p-2.5 rounded-lg border border-white/5">
                          {successData.ownerAddress}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1 font-sans">Credential Class</p>
                        <p className="text-gray-300 capitalize text-xs bg-black/50 p-2.5 rounded-lg border border-white/5">
                          {successData.documentType}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BATCH ISSUANCE */}
          {activeTab === 'batch' && (
            <div className="space-y-6">
              <div className="glass-panel p-8 space-y-6 border border-white/10">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2 pb-4 border-b border-white/5">
                  <Layers className="w-5.5 h-5.5 text-primary" />
                  <span>Batch Register Credentials</span>
                </h3>

                {/* Apply to All Tool */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white flex items-center space-x-1.5">
                      <Settings className="w-4 h-4 text-primary" />
                      <span>Bulk Fill Helper</span>
                    </h4>
                    <span className="text-xs text-gray-400">Instantly populate recipient & type for all uploads</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">Recipient Wallet (Default)</label>
                      <input 
                        type="text"
                        placeholder="0x..."
                        value={batchApplyAll.ownerAddress}
                        onChange={(e) => setBatchApplyAll(prev => ({ ...prev, ownerAddress: e.target.value }))}
                        className="input-field py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">Document Type</label>
                      <select 
                        value={batchApplyAll.documentType}
                        onChange={(e) => setBatchApplyAll(prev => ({ ...prev, documentType: e.target.value }))}
                        className="input-field py-2 text-xs bg-black/50"
                      >
                        <option value="degree">University Degree</option>
                        <option value="diploma">Diploma</option>
                        <option value="certificate">Internship Certificate</option>
                        <option value="transcript">Academic Transcript</option>
                        <option value="id_proof">Identity Proof</option>
                      </select>
                    </div>
                    <button 
                      type="button"
                      onClick={applyToAllBatch}
                      className="btn-secondary py-2 text-xs w-full font-semibold border border-white/10"
                    >
                      Apply To All Items
                    </button>
                  </div>
                </div>

                {/* Dropzone */}
                <div 
                  {...getRootPropsBatch()} 
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                    isDragActiveBatch ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5 bg-black/40'
                  }`}
                >
                  <input {...getInputPropsBatch()} />
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3 animate-pulse" />
                  <p className="text-white font-medium mb-1">Drag & drop multiple files here</p>
                  <p className="text-xs text-gray-500">Supports batch files (PDF, PNG, JPG) up to 10 files</p>
                </div>

                {/* File List */}
                {batchFiles.length > 0 && (
                  <form onSubmit={handleSubmitBatch} className="space-y-4">
                    <div className="border-t border-white/5 pt-4">
                      <h4 className="text-sm font-semibold text-white mb-3">Batch List ({batchFiles.length} files)</h4>
                      
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {batchFiles.map((item, idx) => (
                          <div key={item.id} className="bg-black/50 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="flex items-center space-x-3 w-full md:w-1/3">
                              <File className="w-5 h-5 text-primary flex-shrink-0" />
                              <div className="truncate">
                                <p className="text-white text-sm font-medium truncate">{item.file.name}</p>
                                <p className="text-xxs text-gray-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-3 w-full md:w-2/3">
                              <div className="flex-grow">
                                <input 
                                  type="text" 
                                  placeholder="Recipient Address 0x..."
                                  value={item.ownerAddress}
                                  onChange={(e) => handleBatchFileChange(item.id, 'ownerAddress', e.target.value)}
                                  className="input-field py-1.5 text-xs font-mono w-full"
                                  required
                                />
                              </div>
                              <div className="w-full md:w-36">
                                <select 
                                  value={item.documentType}
                                  onChange={(e) => handleBatchFileChange(item.id, 'documentType', e.target.value)}
                                  className="input-field py-1.5 text-xs bg-black/50 w-full"
                                >
                                  <option value="degree">Degree</option>
                                  <option value="diploma">Diploma</option>
                                  <option value="certificate">Certificate</option>
                                  <option value="transcript">Transcript</option>
                                  <option value="id_proof">ID Proof</option>
                                </select>
                              </div>
                              <button 
                                type="button"
                                onClick={() => removeBatchFile(item.id)}
                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <button 
                        type="submit" 
                        disabled={isBatchSubmitting}
                        className="btn-primary w-full py-4 text-lg font-bold flex items-center justify-center space-x-2"
                      >
                        {isBatchSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Encrypting & Publishing Batch in Single Tx...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            <span>Issue Batch to Blockchain</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {batchSuccessData && (
                <div className="glass-panel p-6 border border-emerald-500/20 bg-emerald-500/5 animate-fade-in-up">
                  <div className="flex items-center space-x-3 mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <div>
                      <h3 className="text-xl font-bold text-white">Batch Registered: {batchSuccessData.registeredCount} Documents</h3>
                      <p className="text-xs text-emerald-400/80">Batch transaction completed successfully.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs font-mono max-h-48 overflow-y-auto">
                    {batchSuccessData.documents.map((d, i) => (
                      <div key={i} className="bg-black/50 p-2.5 rounded border border-white/5">
                        <span className="text-gray-400 font-sans">{d.fileName} ({d.type})</span>
                        <div className="text-xxs text-primary break-all mt-1">Hash: {d.documentHash}</div>
                        <div className="text-xxs text-emerald-400 break-all">IPFS: {d.ipfsHash}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTORY REGISTRY LEDGER */}
          {activeTab === 'history' && (
            <div className="glass-panel p-8 border border-white/10 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <History className="w-5.5 h-5.5 text-primary" />
                  <span>On-Chain Registry Ledger</span>
                </h3>
                <button 
                  onClick={fetchIssuerHistory}
                  className="p-2 hover:bg-white/5 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-all"
                  title="Reload Registry Ledger"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="py-20 text-center text-gray-500">
                  <svg className="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p>Syncing Registry Ledger from Smart Contract...</p>
                </div>
              ) : issuedDocs.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                  <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-white mb-1">No Credentials Issued Yet</h4>
                  <p className="text-sm text-gray-400">Your connected wallet has not registered credentials on this contract.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 text-xs font-semibold uppercase">
                        <th className="py-3 px-4">Hash</th>
                        <th className="py-3 px-4">Recipient</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Registered At</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {issuedDocs.map((doc, idx) => (
                        <tr key={idx} className="hover:bg-white/2 transition-colors">
                          <td className="py-4 px-4 font-mono text-xs text-primary truncate max-w-xs" title={doc.documentHash}>
                            {doc.documentHash.slice(0, 10)}...{doc.documentHash.slice(-8)}
                          </td>
                          <td className="py-4 px-4 font-mono text-xs text-gray-300" title={doc.owner}>
                            {doc.owner.slice(0, 6)}...{doc.owner.slice(-4)}
                          </td>
                          <td className="py-4 px-4 capitalize text-gray-300">
                            {doc.documentType}
                          </td>
                          <td className="py-4 px-4 text-gray-400">
                            {new Date(doc.timestamp * 1000).toLocaleString()}
                          </td>
                          <td className="py-4 px-4">
                            {doc.isRevoked ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                Revoked
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {!doc.isRevoked && (
                              <button 
                                onClick={() => handleRevoke(doc.documentHash)}
                                className="text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/10 transition-all"
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Info Panels (1 Col) */}
        <div className="space-y-6">
          {/* Issuer details panel */}
          <div className="glass-panel p-6 border border-white/10 space-y-4">
            <h3 className="text-md font-bold text-white flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-primary" />
              <span>Issuer Account Info</span>
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                <p className="text-gray-400 mb-1">EVM Registry Role</p>
                <p className="text-white font-semibold">ISSUER_ROLE (Authorized)</p>
              </div>
              <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                <p className="text-gray-400 mb-1">Contract Location</p>
                <p className="text-primary font-mono truncate">{deploymentConfig.contracts.ProofChain}</p>
              </div>
              <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                <p className="text-gray-400 mb-1">Total Issued Ledger</p>
                <p className="text-white font-bold text-lg">{issuedDocs.length} Credentials</p>
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="glass-panel p-6 bg-primary/5 border border-primary/20 space-y-4">
            <h3 className="text-md font-bold text-white flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              <span>Enterprise Standards</span>
            </h3>
            
            <div className="space-y-3 text-xs text-gray-400">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                <p><strong>SHA-256 Integrity:</strong> File buffer hashed on upload ensures zero-knowledge privacy on public ledgers.</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                <p><strong>E2E Storage:</strong> Content uploaded to simulated IPFS gets fully encrypted using AES-256-CBC, shielding identity details.</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                <p><strong>Revocation Ledger:</strong> Immediate revocation changes contract state flags, warning verifiers during audits.</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;
