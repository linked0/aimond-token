
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying AimondToken with the account:", deployer.address);

  const aimondToken = await ethers.deployContract("AimondToken", [deployer.address]);
  await aimondToken.waitForDeployment();

  console.log("AimondToken deployed to:", aimondToken.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
