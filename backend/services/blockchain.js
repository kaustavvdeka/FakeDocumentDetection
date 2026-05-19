const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// Load deployment config
let contractConfig;
const configPath = path.join(__dirname, "..", "contractConfig.json");

try {
  contractConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (error) {
  console.warn("Contract config not found. Deploy contracts first.");
  contractConfig = { contracts: {} };
}

// Load ABIs
const proofChainABIPath = path.join(__dirname, "..", "..", "artifacts", "contracts", "ProofChain.sol", "ProofChain.json");
const soulboundABIPath = path.join(__dirname, "..", "..", "artifacts", "contracts", "SoulboundNFT.sol", "SoulboundNFT.json");
const merkleRegistryABIPath = path.join(__dirname, "..", "..", "artifacts", "contracts", "MerkleDocumentRegistry.sol", "MerkleDocumentRegistry.json");

let proofChainABI = [];
let soulboundABI = [];
let merkleRegistryABI = [];

try {
  proofChainABI = JSON.parse(fs.readFileSync(proofChainABIPath, "utf8")).abi;
  soulboundABI = JSON.parse(fs.readFileSync(soulboundABIPath, "utf8")).abi;
  merkleRegistryABI = JSON.parse(fs.readFileSync(merkleRegistryABIPath, "utf8")).abi;
} catch (error) {
  console.warn("Contract ABIs not found. Compile contracts first.");
}

// Provider and signer
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract instances
let proofChainContract = null;
let soulboundContract = null;
let merkleRegistryContract = null;

if (contractConfig.contracts.ProofChain) {
  proofChainContract = new ethers.Contract(
    contractConfig.contracts.ProofChain,
    proofChainABI,
    signer
  );
}

if (contractConfig.contracts.SoulboundNFT) {
  soulboundContract = new ethers.Contract(
    contractConfig.contracts.SoulboundNFT,
    soulboundABI,
    signer
  );
}

if (contractConfig.contracts.MerkleDocumentRegistry) {
  merkleRegistryContract = new ethers.Contract(
    contractConfig.contracts.MerkleDocumentRegistry,
    merkleRegistryABI,
    signer
  );
}

module.exports = {
  provider,
  signer,
  proofChainContract,
  soulboundContract,
  merkleRegistryContract,
  contractConfig,
};
