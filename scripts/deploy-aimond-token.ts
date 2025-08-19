
import { ethers } from "hardhat";
import { isAddress, ZeroAddress } from "ethers";
import "dotenv/config";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying AimondToken with the account:", deployer.address);

  const initialOwner = process.env.INITIAL_OWNER;
  if (!initialOwner) {
    throw new Error("INITIAL_OWNER is not set in .env file");
  }
  if (!isAddress(initialOwner)) {
    throw new Error(`INITIAL_OWNER is invalid: ${initialOwner}`);
  }
  if (initialOwner === ZeroAddress) {
    throw new Error("INITIAL_OWNER cannot be the zero address");
  }
  if (initialOwner === "0x0000000000000000000000000000000000000000") {
    throw new Error("INITIAL_OWNER cannot be the zero address");
  }

  const aimondToken = await ethers.deployContract("AimondToken", [initialOwner]);
  await aimondToken.waitForDeployment();

  console.log("AimondToken deployed to:", aimondToken.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
