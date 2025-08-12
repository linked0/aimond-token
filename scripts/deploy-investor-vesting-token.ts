
import { ethers } from "hardhat";
import "dotenv/config";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  if (!process.env.AIMOND_ADDRESS) {
    throw new Error("AIMOND_ADDRESS is not set in .env file");
  }

  // Deploy InvestorVestingToken
  const investorVestingToken = await ethers.deployContract("InvestorVestingToken", [
    deployer.address,
    process.env.AIMOND_ADDRESS
  ]);

  console.log("InvestorVestingToken deployed to:", investorVestingToken.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
