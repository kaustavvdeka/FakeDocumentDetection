import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const Web3Context = createContext();

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            connectWallet();
          }
        } catch (error) {
          console.error("Connection check error:", error);
        }
      }
    };
    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
          setSigner(null);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("Please install MetaMask to use this feature!");
      return;
    }

    try {
      setIsConnecting(true);
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      await ethersProvider.send("eth_requestAccounts", []);
      
      const ethersSigner = await ethersProvider.getSigner();
      const address = await ethersSigner.getAddress();
      
      setProvider(ethersProvider);
      setSigner(ethersSigner);
      setAccount(address);
      
      toast.success("Wallet connected!");
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    toast.success("Wallet disconnected.");
  };

  const value = {
    account,
    provider,
    signer,
    isConnecting,
    connectWallet,
    disconnectWallet
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};
