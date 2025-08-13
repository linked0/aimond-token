
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

  // Deploy FounderVestingToken
  const founderVestingToken = await ethers.deployContract("FounderVestingToken", [
    deployer.address,
    aimondAddress
  ]);
  await founderVestingToken.waitForDeployment();

  console.log("FounderVestingToken deployed to:", founderVestingToken.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
