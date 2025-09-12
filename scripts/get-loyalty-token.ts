import { ethers } from "hardhat";
import "dotenv/config";

async function main() {
  const loyaltyPointAddress = process.env.LOYALTY_POINT_ADDRESS;
  if (!loyaltyPointAddress) {
    throw new Error("LOYALTY_POINT_ADDRESS not found in .env file");
  }

  const loyaltyPoint = await ethers.getContractAt("LoyaltyPoint", loyaltyPointAddress);

  const tokenAddress = await loyaltyPoint.amdToken();

  console.log(`Aimond Token address in LoyaltyPoint contract: ${tokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
