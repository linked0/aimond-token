
import { ethers } from "hardhat";
import { isAddress, ZeroAddress } from "ethers";
import "dotenv/config";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Creating vesting schedule with the account:", deployer.address);

  // --- Get and validate variables from .env ---
  const userAddress = process.env.INVESTOR_ADDRESS;
  if (!userAddress) {
    throw new Error("INVESTOR_ADDRESS is not set in .env file");
  }
  if (!isAddress(userAddress)) {
    throw new Error(`INVESTOR_ADDRESS is invalid: ${userAddress}`);
  }
  if (userAddress === ZeroAddress) {
    throw new Error("INVESTOR_ADDRESS cannot be the zero address");
  }
  console.log(`Beneficiary address: ${userAddress}`);

  const contractAddress = process.env.INVESTOR_VESTING_ADDRESS;
  if (!contractAddress) {
    throw new Error("INVESTOR_VESTING_ADDRESS is not set in .env file.");
  }
  if (!isAddress(contractAddress)) {
    throw new Error(`Invalid INVESTOR_VESTING_ADDRESS: ${contractAddress}`);
  }
  console.log(`InvestorVestingToken contract address: ${contractAddress}`);

  const totalAmountStr = process.env.INVESTOR_VESTING_AMOUNT;
  if (!totalAmountStr) {
    throw new Error("INVESTOR_VESTING_AMOUNT is not set in .env file.");
  }
  const totalAmount = ethers.parseUnits(totalAmountStr, 18); // Assuming 18 decimals
  if (totalAmount <= 0) {
    throw new Error("Total amount must be greater than 0.");
  }
  console.log(`Total vesting amount: ${ethers.formatUnits(totalAmount, 18)} tokens`);

  // --- Get contract instance and call createVesting ---
  const investorVestingToken = await ethers.getContractAt("InvestorVestingToken", contractAddress, deployer);

  console.log("Sending transaction to create vesting schedule...");
  const tx = await investorVestingToken.createVesting(userAddress, totalAmount);
  
  console.log(`Transaction sent. Waiting for confirmation...`);
  console.log(`Transaction Hash: ${tx.hash}`);
  
  await tx.wait();

  console.log("Vesting schedule created successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
