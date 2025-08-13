
import { ethers } from "hardhat";
import { isAddress } from "ethers";
import "dotenv/config";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const aimondAddress = process.env.AIMOND_ADDRESS;
  if (!aimondAddress) {
    throw new Error("AIMOND_ADDRESS is not set in .env file");
  }
  if (!isAddress(aimondAddress)) {
    throw new Error(`AIMOND_ADDRESS is invalid: ${aimondAddress}`);
  }

  // Deploy Airdrop contract
  const totalAirdropAllocation = ethers.parseEther("1000000"); // 1 million tokens
  const airdrop = await ethers.deployContract("Airdrop", [
    aimondAddress,
    deployer.address,
    totalAirdropAllocation
  ]);
  await airdrop.waitForDeployment();

  console.log("Airdrop deployed to:", airdrop.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
