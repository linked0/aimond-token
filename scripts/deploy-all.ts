
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy AimondToken
  const aimondToken = await ethers.deployContract("AimondToken", [deployer.address]);
  await aimondToken.waitForDeployment();
  console.log("AimondToken deployed to:", aimondToken.target);

  

  // Deploy EmployeeVestingToken
  const employeeVestingToken = await ethers.deployContract("EmployeeVestingToken", [
    deployer.address,
    aimondToken.target
  ]);
  await employeeVestingToken.waitForDeployment();
  console.log("EmployeeVestingToken deployed to:", employeeVestingToken.target);

  // Deploy FounderVestingToken
  const founderVestingToken = await ethers.deployContract("FounderVestingToken", [
    deployer.address,
    aimondToken.target
  ]);
  await founderVestingToken.waitForDeployment();
  console.log("FounderVestingToken deployed to:", founderVestingToken.target);

  // Deploy InvestorVestingToken
  const investorVestingToken = await ethers.deployContract("InvestorVestingToken", [
    deployer.address,
    aimondToken.target
  ]);
  await investorVestingToken.waitForDeployment();
  console.log("InvestorVestingToken deployed to:", investorVestingToken.target);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
