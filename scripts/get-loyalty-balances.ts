import { ethers } from "hardhat";
import { formatUnits } from "ethers";
import "dotenv/config";

async function main() {
  const aimondAddress = process.env.AIMOND_ADDRESS;
  if (!aimondAddress) {
    throw new Error("AIMOND_ADDRESS not found in .env file");
  }

  const recipient1Address = process.env.LOYALTY_POINT_RECIPIENT_1;
  if (!recipient1Address) {
    throw new Error("LOYALTY_POINT_RECIPIENT_1 not found in .env file");
  }

  const recipient2Address = process.env.LOYALTY_POINT_RECIPIENT_2;
  if (!recipient2Address) {
    throw new Error("LOYALTY_POINT_RECIPIENT_2 not found in .env file");
  }

  const loyaltyPointAddress = process.env.LOYALTY_POINT_ADDRESS;
  if (!loyaltyPointAddress) {
    throw new Error("LOYALTY_POINT_ADDRESS not found in .env file");
  }

  const aimondToken = await ethers.getContractAt("AimondToken", aimondAddress);

  const balance1 = await aimondToken.balanceOf(recipient1Address);
  const balance2 = await aimondToken.balanceOf(recipient2Address);
  const loyaltyPointBalance = await aimondToken.balanceOf(loyaltyPointAddress);


  console.log(`Aimond Token balance for ${recipient1Address}: ${formatUnits(balance1, 18)}`);
  console.log(`Aimond Token balance for ${recipient2Address}: ${formatUnits(balance2, 18)}`);
  console.log(`Aimond Token balance for LoyaltyPoint contract (${loyaltyPointAddress}): ${formatUnits(loyaltyPointBalance, 18)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});