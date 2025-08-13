
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

  // Deploy EmployeeVestingToken
  const employeeVestingToken = await ethers.deployContract("EmployeeVestingToken", [
    deployer.address,
    aimondAddress
  ]);
  await employeeVestingToken.waitForDeployment();

  console.log("EmployeeVestingToken deployed to:", employeeVestingToken.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
