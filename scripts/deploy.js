const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy ProofChain
  console.log("\n--- Deploying ProofChain ---");
  const ProofChain = await hre.ethers.getContractFactory("ProofChain");
  const proofChain = await ProofChain.deploy();
  await proofChain.waitForDeployment();
  const proofChainAddress = await proofChain.getAddress();
  console.log("ProofChain deployed to:", proofChainAddress);

  // Deploy SoulboundNFT
  console.log("\n--- Deploying SoulboundNFT ---");
  const SoulboundNFT = await hre.ethers.getContractFactory("SoulboundNFT");
  const soulboundNFT = await SoulboundNFT.deploy();
  await soulboundNFT.waitForDeployment();
  const soulboundAddress = await soulboundNFT.getAddress();
  console.log("SoulboundNFT deployed to:", soulboundAddress);

  // Deploy MerkleDocumentRegistry
  console.log("\n--- Deploying MerkleDocumentRegistry ---");
  const MerkleDocumentRegistry = await hre.ethers.getContractFactory("MerkleDocumentRegistry");
  const merkleRegistry = await MerkleDocumentRegistry.deploy();
  await merkleRegistry.waitForDeployment();
  const merkleAddress = await merkleRegistry.getAddress();
  console.log("MerkleDocumentRegistry deployed to:", merkleAddress);

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      ProofChain: proofChainAddress,
      SoulboundNFT: soulboundAddress,
      MerkleDocumentRegistry: merkleAddress,
    },
    timestamp: new Date().toISOString(),
  };

  // Write to backend config
  const configPath = "./backend/contractConfig.json";
  fs.writeFileSync(configPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to ${configPath}`);

  // Write to frontend config
  const frontendConfigPath = "./frontend/src/contracts/deploymentConfig.json";
  const frontendDir = "./frontend/src/contracts";
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  fs.writeFileSync(frontendConfigPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment info saved to ${frontendConfigPath}`);

  // Copy ABIs for frontend
  const proofChainArtifact = await hre.artifacts.readArtifact("ProofChain");
  const soulboundArtifact = await hre.artifacts.readArtifact("SoulboundNFT");
  const merkleArtifact = await hre.artifacts.readArtifact("MerkleDocumentRegistry");
  
  fs.writeFileSync(
    `${frontendDir}/ProofChainABI.json`,
    JSON.stringify(proofChainArtifact.abi, null, 2)
  );
  fs.writeFileSync(
    `${frontendDir}/SoulboundNFTABI.json`,
    JSON.stringify(soulboundArtifact.abi, null, 2)
  );
  fs.writeFileSync(
    `${frontendDir}/MerkleDocumentRegistryABI.json`,
    JSON.stringify(merkleArtifact.abi, null, 2)
  );
  console.log("ABIs copied to frontend");

  console.log("\n✅ All contracts deployed successfully!");
  console.log("=".repeat(50));
  console.log(`ProofChain:             ${proofChainAddress}`);
  console.log(`SoulboundNFT:           ${soulboundAddress}`);
  console.log(`MerkleDocumentRegistry: ${merkleAddress}`);
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
