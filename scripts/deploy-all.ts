
import { ethers } from "hardhat";
import { isAddress, ZeroAddress } from "ethers";
import "dotenv/config";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

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

  const initialDistributorManager = process.env.INITIAL_DISTRIBUTOR_MANAGER;
  if (!initialDistributorManager) {
    throw new Error("INITIAL_DISTRIBUTOR_MANAGER is not set in .env file");
  }
  if (!isAddress(initialDistributorManager)) {
    throw new Error(`INITIAL_DISTRIBUTOR_MANAGER is invalid: ${initialDistributorManager}`);
  }
  if (initialDistributorManager === ZeroAddress) {
    throw new Error("INITIAL_DISTRIBUTOR_MANAGER cannot be the zero address");
  }

  // Deploy AimondToken
  const aimondToken = await ethers.deployContract("AimondToken", [initialOwner]);
  await aimondToken.waitForDeployment();
  console.log("AimondToken deployed to:", aimondToken.target);

  // Deploy EmployeeVestingToken
  const employeeVestingToken = await ethers.deployContract("EmployeeVestingToken", [
    initialOwner,
    initialDistributorManager,
    aimondToken.target
  ]);
  await employeeVestingToken.waitForDeployment();
  console.log("EmployeeVestingToken deployed to:", employeeVestingToken.target);

  // Deploy FounderVestingToken
  const founderVestingToken = await ethers.deployContract("FounderVestingToken", [
    initialOwner,
    initialDistributorManager,
    aimondToken.target
  ]);
  await founderVestingToken.waitForDeployment();
  console.log("FounderVestingToken deployed to:", founderVestingToken.target);

  // Deploy InvestorVestingToken
  const investorVestingToken = await ethers.deployContract("InvestorVestingToken", [
    initialOwner,
    initialDistributorManager,
    aimondToken.target
  ]);
  await investorVestingToken.waitForDeployment();
  console.log("InvestorVestingToken deployed to:", investorVestingToken.target);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
