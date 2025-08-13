
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

  // Deploy InvestorVestingToken
  const investorVestingToken = await ethers.deployContract("InvestorVestingToken", [
    deployer.address,
    aimondAddress
  ]);
  await investorVestingToken.waitForDeployment();

  console.log("InvestorVestingToken deployed to:", investorVestingToken.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
