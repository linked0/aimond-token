
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy AimondToken first
  const aimondToken = await ethers.deployContract("AimondToken", [deployer.address]);

  console.log("AimondToken deployed to:", aimondToken.target);

  // Deploy Airdrop contract
  const totalAirdropAllocation = ethers.parseEther("1000000"); // 1 million tokens
  const airdrop = await ethers.deployContract("Airdrop", [
    aimondToken.target,
    deployer.address,
    totalAirdropAllocation
  ]);

  console.log("Airdrop deployed to:", airdrop.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
