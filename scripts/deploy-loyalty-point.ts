import { ethers } from "hardhat";
import { isAddress, ZeroHash } from "ethers";
import "dotenv/config";

async function main() {
  const [ , , lpDeployer] = await ethers.getSigners();

  console.log("Deploying LoyaltyPoint with the account:", lpDeployer.address);

  const aimondAddress = process.env.AIMOND_ADDRESS;
  if (!aimondAddress) {
    throw new Error("AIMOND_ADDRESS is not set in .env file");
  }
  if (!isAddress(aimondAddress)) {
    throw new Error(`AIMOND_ADDRESS is invalid: ${aimondAddress}`);
  }

  const loyaltyPoint = await ethers.deployContract("LoyaltyPoint", [
    aimondAddress,
    ZeroHash,
  ], { signer: lpDeployer });
  await loyaltyPoint.waitForDeployment();

  console.log("LoyaltyPoint deployed to:", loyaltyPoint.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
