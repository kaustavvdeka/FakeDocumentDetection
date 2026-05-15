import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { Shield, Wallet, LayoutDashboard, Search, Menu, X } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const { account, connectWallet, isConnecting } = useWeb3();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="border-b border-white/5 bg-surface/50 backdrop-blur-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center space-x-3">
            <div className="bg-primary/20 p-2 rounded-xl">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-white">
              Proof<span className="text-primary">Chain</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/verify" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
              <Search className="w-4 h-4" />
              <span>Verify Document</span>
            </Link>
            <Link to="/dashboard" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
              <LayoutDashboard className="w-4 h-4" />
              <span>Issuer Dashboard</span>
            </Link>

            {account ? (
              <div className="flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-mono text-gray-300">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="btn-primary flex items-center space-x-2"
              >
                <Wallet className="w-4 h-4" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass-panel border-t-0 rounded-t-none">
          <div className="px-4 pt-2 pb-6 space-y-4">
            <Link 
              to="/verify" 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/5"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Verify Document
            </Link>
            <Link 
              to="/dashboard" 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/5"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Issuer Dashboard
            </Link>
            
            <div className="px-3 pt-2">
              {account ? (
                <div className="flex items-center space-x-2 bg-white/5 px-4 py-3 rounded-xl border border-white/10 justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-sm font-mono text-gray-300">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="btn-primary w-full flex justify-center items-center space-x-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
