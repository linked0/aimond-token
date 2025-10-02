
import { ethers } from "hardhat";
import { isAddress, ZeroAddress } from "ethers";
import "dotenv/config";

export interface DeploymentResult {
  aimondToken: any;
  loyaltyPoint: any;
  employeeVestingToken: any;
  founderVestingToken: any;
  investorVestingToken: any;
  mockVestingToken?: any;
}

export async function deployContracts(): Promise<DeploymentResult> {
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

  // Deploy LoyaltyPoint
  const loyaltyPoint = await ethers.deployContract("LoyaltyPoint", [aimondToken.target, ethers.ZeroHash]);
  await loyaltyPoint.waitForDeployment();
  console.log("LoyaltyPoint deployed to:", loyaltyPoint.target);

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

  // Deploy MockVestingToken unconditionally
  const ONE_DAY_IN_SECONDS = 24 * 60 * 60;
  const THIRTY_DAYS_IN_SECONDS = 30 * ONE_DAY_IN_SECONDS;
  const mockVestingToken = await ethers.deployContract("MockVestingToken", [
    initialOwner,
    initialDistributorManager,
    aimondToken.target,
    process.env.MOCK_CLIFF_DURATION || "86400", // _cliffDurationInSeconds (default: 1 day)
    process.env.MOCK_VESTING_DURATION || "2592000", // _vestingDurationInSeconds (default: 30 days)
    process.env.MOCK_INSTALLMENT_COUNT || "12" // _installmentCount (default: 12)
  ]);
  await mockVestingToken.waitForDeployment();
  console.log("MockVestingToken deployed to:", mockVestingToken.target);

  const result: DeploymentResult = {
    aimondToken,
    loyaltyPoint,
    employeeVestingToken,
    founderVestingToken,
    investorVestingToken,
    mockVestingToken
  };

  return result;
}

export function logDeploymentResults(result: DeploymentResult, includeMock: boolean = false) {
  console.log(`AIMOND_ADDRESS=${result.aimondToken.target}`);
  console.log(`INVESTOR_VESTING_ADDRESS=${result.investorVestingToken.target}`);
  console.log(`FOUNDER_VESTING_ADDRESS=${result.founderVestingToken.target}`);
  console.log(`EMPLOYEE_VESTING_ADDRESS=${result.employeeVestingToken.target}`);
  console.log(`MOCK_VESTING_ADDRESS=${result.mockVestingToken.target}`);
  console.log(`LOYALTY_POINT_ADDRESS=${result.loyaltyPoint.target}`);
  
  console.log(`
REACT_APP_INVESTOR_VESTING_ADDRESS=${result.investorVestingToken.target}
REACT_APP_FOUNDER_VESTING_ADDRESS=${result.founderVestingToken.target}
REACT_APP_EMPLOYEE_VESTING_ADDRESS=${result.employeeVestingToken.target}
REACT_APP_MOCK_VESTING_ADDRESS=${result.mockVestingToken.target}
REACT_APP_LOYALTY_POINT_ADDRESS=${result.loyaltyPoint.target}
`);

  // Backend logs
  console.log(`LOYALTY_POINT_ADDRESS=${result.loyaltyPoint.target}`);
}

async function main() {
  const result = await deployContracts();
  logDeploymentResults(result, true);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
