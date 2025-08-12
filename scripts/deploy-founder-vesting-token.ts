
import { ethers } from "hardhat";
import "dotenv/config";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  if (!process.env.AIMOND_ADDRESS) {
    throw new Error("AIMOND_ADDRESS is not set in .env file");
  }

  // Deploy FounderVestingToken
  const founderVestingToken = await ethers.deployContract("FounderVestingToken", [
    deployer.address,
    process.env.AIMOND_ADDRESS
  ]);

  console.log("FounderVestingToken deployed to:", founderVestingToken.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
