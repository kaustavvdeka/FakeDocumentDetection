import { Link } from 'react-router-dom';
import { Shield, FileCheck, BrainCircuit, ArrowRight, Activity, Users, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../utils/api';

const Home = () => {
  const [stats, setStats] = useState({ documents: 0, verifications: 0, institutions: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.getStats();
        if (res.success) {
          setStats({
            documents: res.data.totalDocuments || 0,
            verifications: res.data.totalVerifications || 0,
            institutions: res.data.totalIssuers || 0,
          });
        }
      } catch (err) {
        console.error("Failed to load stats", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto relative z-10">
        <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full mb-8 animate-fade-in-up">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          <span className="text-sm font-medium">Live on Polygon Network</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Trust, Verified by <br />
          <span className="gradient-text">Blockchain & AI</span>
        </h1>
        
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          The ultimate decentralized platform for issuing and verifying tamper-proof certificates, degrees, and legal documents. Zero fraud, instant verification.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Link to="/verify" className="btn-primary w-full sm:w-auto flex items-center justify-center space-x-2 group text-lg px-8 py-4">
            <SearchIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Verify Document</span>
          </Link>
          <Link to="/dashboard" className="btn-secondary w-full sm:w-auto flex items-center justify-center space-x-2 group text-lg px-8 py-4">
            <span>Issue Credentials</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
        {[
          { label: 'Secured Documents', value: stats.documents.toLocaleString(), icon: <FileText className="w-6 h-6 text-blue-400" /> },
          { label: 'Instant Verifications', value: stats.verifications.toLocaleString(), icon: <Activity className="w-6 h-6 text-emerald-400" /> },
          { label: 'Trusted Institutions', value: stats.institutions.toLocaleString(), icon: <Users className="w-6 h-6 text-purple-400" /> },
        ].map((stat, idx) => (
          <div key={idx} className="glass-panel p-8 text-center animate-fade-in-up" style={{ animationDelay: `${idx * 150}ms` }}>
            <div className="flex justify-center mb-4">{stat.icon}</div>
            <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
            <div className="text-gray-400 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Features Section */}
      <div className="mt-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">How ProofChain Works</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">Our multi-layered approach guarantees that a document can never be forged, edited, or manipulated without instant detection.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Shield className="w-8 h-8 text-primary" />,
              title: 'Cryptographic Hashing',
              desc: 'Every document is converted into a unique SHA-256 fingerprint. Changing even a single pixel alters the hash completely.'
            },
            {
              icon: <BrainCircuit className="w-8 h-8 text-purple-500" />,
              title: 'AI Forgery Detection',
              desc: 'Advanced machine learning models analyze metadata, PDF structure, and image layers to detect Photoshop manipulation.'
            },
            {
              icon: <FileCheck className="w-8 h-8 text-emerald-500" />,
              title: 'Blockchain Immutability',
              desc: 'The document fingerprint is permanently written to the blockchain. No central server to hack, no database to alter.'
            }
          ].map((feature, idx) => (
            <div key={idx} className="glass-panel p-8 group hover:-translate-y-2 transition-transform duration-300">
              <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:bg-white/10 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SearchIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default Home;
