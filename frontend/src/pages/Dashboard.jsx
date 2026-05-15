import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useWeb3 } from '../context/Web3Context';
import { Upload, File, LayoutDashboard, Send, ShieldPlus, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { account, isConnecting, connectWallet } = useWeb3();
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    ownerAddress: '',
    documentType: 'degree',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
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

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) return toast.error("Please connect your wallet first");
    if (!file) return toast.error("Please upload a document");
    if (!formData.ownerAddress) return toast.error("Please enter the recipient's wallet address");

    setIsSubmitting(true);
    setSuccessData(null);

    try {
      const submitData = new FormData();
      submitData.append('document', file);
      submitData.append('ownerAddress', formData.ownerAddress);
      submitData.append('documentType', formData.documentType);
      
      const res = await api.registerDocument(submitData);
      
      if (res.success) {
        toast.success("Document successfully registered on blockchain!");
        setSuccessData(res.data);
        setFile(null);
        setFormData({ ownerAddress: '', documentType: 'degree' });
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

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="glass-panel p-12 max-w-lg mx-auto">
          <div className="bg-primary/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <LayoutDashboard className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Issuer Access Only</h2>
          <p className="text-gray-400 mb-8">Please connect your authorized institution wallet to issue credentials on the blockchain.</p>
          <button 
            onClick={connectWallet}
            disabled={isConnecting}
            className="btn-primary w-full py-4 text-lg"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Institution Dashboard</h1>
          <p className="text-gray-400">Issue secure, tamper-proof credentials to the blockchain</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-sm font-mono text-gray-300">
            Connected: {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="glass-panel p-8 space-y-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white flex items-center space-x-2 border-b border-white/10 pb-4">
                <ShieldPlus className="w-5 h-5 text-primary" />
                <span>Issue New Document</span>
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Document Type
                </label>
                <select 
                  name="documentType"
                  value={formData.documentType}
                  onChange={handleInputChange}
                  className="input-field appearance-none bg-black/40"
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Recipient Wallet Address
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
                <p className="text-xs text-gray-500 mt-2">The EVM-compatible address that will own this credential.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload Document
                </label>
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive ? 'border-primary bg-primary/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5 bg-black/20'
                  }`}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="space-y-2">
                      <File className="w-10 h-10 text-primary mx-auto" />
                      <p className="text-white font-medium truncate">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragActive ? 'text-primary' : 'text-gray-400'}`} />
                      <p className="text-sm text-white mb-1">Drag & drop the document here</p>
                      <p className="text-xs text-gray-500">Supports PDF, PNG, JPG</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button 
                type="submit" 
                disabled={isSubmitting || !file}
                className="btn-primary w-full py-4 text-lg font-semibold flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating Hash & Registering...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Issue to Blockchain</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column - Success Data or Guidelines */}
        <div className="space-y-6">
          {successData ? (
            <div className="glass-panel p-6 border-t-4 border-emerald-500 animate-fade-in-up">
              <div className="flex items-center space-x-3 mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <h3 className="text-xl font-semibold text-white">Successfully Issued</h3>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Transaction Hash</p>
                  <p className="text-emerald-400 font-mono text-xs break-all bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                    {successData.transactionHash}
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-500 mb-1">Document SHA-256 Hash</p>
                  <p className="text-gray-300 font-mono text-xs break-all bg-black/40 p-2 rounded-lg border border-white/10">
                    {successData.documentHash}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 mb-1">Recipient</p>
                    <p className="text-gray-300 font-mono text-xs truncate">
                      {successData.ownerAddress}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Type</p>
                    <p className="text-gray-300 capitalize">
                      {successData.documentType}
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSuccessData(null)}
                className="mt-6 w-full btn-secondary text-sm"
              >
                Issue Another Document
              </button>
            </div>
          ) : (
            <div className="glass-panel p-6 bg-primary/5 border-primary/20">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <span>Guidelines</span>
              </h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                  <span>Ensure the document is final before uploading. Any future changes will invalidate the blockchain verification.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                  <span>The original document is kept private. Only the cryptographic hash is stored on the public ledger.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                  <span>Double check the recipient's wallet address. Once issued, the record is immutable.</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
