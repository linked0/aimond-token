import { ethers } from "hardhat";
import { parseUnits } from "ethers";
import * as dotenv from "dotenv";
dotenv.config({ path: process.env.ENV_FILE || ".env" });

interface VestingContract {
  name: string;
  address: string;
  fundAmount: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Funding all contracts with the account:", deployer.address);

  const aimondAddress = process.env.AIMOND_ADDRESS;
  if (!aimondAddress) {
    throw new Error("AIMOND_ADDRESS not found in .env file");
  }

  const aimondToken = await ethers.getContractAt("AimondToken", aimondAddress);

  // Define all contracts to fund
  const contractsToFund: VestingContract[] = [
    {
      name: "LoyaltyPoint",
      address: process.env.LOYALTY_POINT_ADDRESS || "",
      fundAmount: process.env.LOYALTY_POINT_FUND_AMOUNT || ""
    },
    {
      name: "InvestorVesting",
      address: process.env.INVESTOR_VESTING_ADDRESS || "",
      fundAmount: process.env.INVESTOR_VESTING_FUND_AMOUNT || ""
    },
    {
      name: "FounderVesting",
      address: process.env.FOUNDER_VESTING_ADDRESS || "",
      fundAmount: process.env.FOUNDER_VESTING_FUND_AMOUNT || ""
    },
    {
      name: "EmployeeVesting",
      address: process.env.EMPLOYEE_VESTING_ADDRESS || "",
      fundAmount: process.env.EMPLOYEE_VESTING_FUND_AMOUNT || ""
    },
    {
      name: "MockVesting",
      address: process.env.MOCK_VESTING_ADDRESS || "",
      fundAmount: process.env.MOCK_VESTING_FUND_AMOUNT || ""
    }
  ];

  // Filter out contracts that don't have both address and fund amount
  const validContracts = contractsToFund.filter(contract => 
    contract.address && contract.fundAmount && contract.fundAmount !== "0"
  );

  if (validContracts.length === 0) {
    console.log("No contracts to fund. Please check your .env file for contract addresses and fund amounts.");
    return;
  }

  console.log(`Found ${validContracts.length} contracts to fund:`);
  validContracts.forEach(contract => {
    console.log(`- ${contract.name}: ${contract.fundAmount} tokens to ${contract.address}`);
  });

  // Fund each contract
  for (const contract of validContracts) {
    try {
      // Assuming AimondToken has 18 decimals
      const amountToFund = parseUnits(contract.fundAmount, 18);

      console.log(`\nAttempting to transfer ${contract.fundAmount} Aimond tokens (${amountToFund.toString()} raw units) to ${contract.name} (${contract.address})`);

      const tx = await aimondToken.transfer(contract.address, amountToFund);
      await tx.wait();

      console.log(`✅ Successfully transferred ${contract.fundAmount} Aimond tokens to ${contract.name}`);
    } catch (error) {
      console.error(`❌ Failed to transfer tokens to ${contract.name}:`, error);
    }
  }

  console.log("\n🎉 Funding process completed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
