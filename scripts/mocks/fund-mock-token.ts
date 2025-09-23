import { ethers } from "hardhat";
import { parseUnits } from "ethers";
import * as dotenv from "dotenv";
dotenv.config({ path: process.env.ENV_FILE || ".env" });

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Funding MockVestingToken contract with the account:", deployer.address);

  const aimondAddress = process.env.AIMOND_ADDRESS;
  if (!aimondAddress) {
    throw new Error("AIMOND_ADDRESS not found in .env file");
  }

  const mockVestingAddress = process.env.MOCK_VESTING_ADDRESS;
  if (!mockVestingAddress) {
    throw new Error("MOCK_VESTING_ADDRESS not found in .env file.");
  }

  const mockVestingFund = process.env.MOCK_VESTING_FUND_AMOUNT || "1000000"; // Default to 1,000,000 if not set

  const aimondToken = await ethers.getContractAt("AimondToken", aimondAddress);

  // Assuming AimondToken has 18 decimals
  const amountToFund = parseUnits(mockVestingFund, 18);

  console.log(`Attempting to transfer ${mockVestingFund} Aimond tokens (${amountToFund.toString()} raw units) to ${mockVestingAddress}`);

  const tx = await aimondToken.transfer(mockVestingAddress, amountToFund);
  await tx.wait();

  console.log(`Successfully transferred ${mockVestingFund} Aimond tokens to ${mockVestingAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
