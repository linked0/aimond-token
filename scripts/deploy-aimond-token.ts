
import { ethers } from "hardhat";
import { isAddress, ZeroAddress } from "ethers";
import "dotenv/config";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying AimondToken with the account:", deployer.address);

  const initialOwner = process.env.INITIAL_OWNER || deployer.address;
  if (initialOwner === ZeroAddress) {
    throw new Error("INITIAL_OWNER cannot be the zero address");
  }
  if (initialOwner === "0x0000000000000000000000000000000000000000") {
    throw new Error("INITIAL_OWNER cannot be the zero address");
  }
  if (!isAddress(initialOwner)) {
    throw new Error(`Invalid address for INITIAL_OWNER: ${initialOwner}`);
  }


  const aimondToken = await ethers.deployContract("AimondToken", [initialOwner]);
  await aimondToken.waitForDeployment();

  console.log("AimondToken deployed to:", aimondToken.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
