import { ethers } from "hardhat";
import { parseUnits } from "ethers";
import * as dotenv from "dotenv";
dotenv.config({ path: process.env.ENV_FILE || ".env" });

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Funding LoyaltyPoint contract with the account:", deployer.address);

  const aimondAddress = process.env.AIMOND_ADDRESS;
  if (!aimondAddress) {
    throw new Error("AIMOND_ADDRESS not found in .env file");
  }

  const loyaltyPointAddress = process.env.LOYALTY_POINT_ADDRESS;
  if (!loyaltyPointAddress) {
    throw new Error("LOYALTY_POINT_ADDRESS not found in .env file");
  }

  const loyaltyPointFund = process.env.LOYALTY_POINT_FUND_AMOUNT;
  if (!loyaltyPointFund) {
    throw new Error("LOYALTY_POINT_FUND_AMOUNT not found in .env file");
  }

  const aimondToken = await ethers.getContractAt("AimondToken", aimondAddress);

  // Assuming AimondToken has 18 decimals
  const amountToFund = parseUnits(loyaltyPointFund, 18);

  console.log(`Attempting to transfer ${loyaltyPointFund} Aimond tokens (${amountToFund.toString()} raw units) to ${loyaltyPointAddress}`);

  const tx = await aimondToken.transfer(loyaltyPointAddress, amountToFund);
  await tx.wait();

  console.log(`Successfully transferred ${loyaltyPointFund} Aimond tokens to ${loyaltyPointAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
