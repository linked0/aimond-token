import { ethers } from "hardhat";
import "dotenv/config";

async function main() {
  const loyaltyPointAddress = process.env.LOYALTY_POINT_ADDRESS;
  if (!loyaltyPointAddress) {
    throw new Error("LOYALTY_POINT_ADDRESS not found in .env file");
  }

  const loyaltyPointAdminKey = process.env.LOYALTY_POINT_ADMIN_KEY;
  if (!loyaltyPointAdminKey) {
    throw new Error("LOYALTY_POINT_ADMIN_KEY not found in .env file");
  }
  const loyaltyPointAdminWallet = new ethers.Wallet(loyaltyPointAdminKey);
  const loyaltyPointAdminAddress = loyaltyPointAdminWallet.address;

  const loyaltyPoint = await ethers.getContractAt("LoyaltyPoint", loyaltyPointAddress);

  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));

  const isAdmin = await loyaltyPoint.hasRole(ADMIN_ROLE, loyaltyPointAdminAddress);

  console.log(`Is ${loyaltyPointAdminAddress} an admin? ${isAdmin}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
