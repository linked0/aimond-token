import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: process.env.ENV_FILE || ".env" });

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Transferring MockVestingToken to safe wallet with the account:", deployer.address);

  const mockVestingAddress = process.env.MOCK_VESTING_ADDRESS;
  if (!mockVestingAddress) {
    throw new Error("MOCK_VESTING_ADDRESS not found in .env file.");
  }

  const mockVestingSafeWallet = process.env.MOCK_VESTING_SAFE_WALLET;
  if (!mockVestingSafeWallet) {
    throw new Error("MOCK_VESTING_SAFE_WALLET not found in .env file.");
  }

  const MockVestingToken = await ethers.getContractFactory("MockVestingToken");
  const mockVestingToken = MockVestingToken.attach(mockVestingAddress);

  const balance = await mockVestingToken.balanceOf(deployer.address);
  console.log(`Deployer MockVestingToken balance: ${ethers.formatUnits(balance, await mockVestingToken.decimals())}`);

  if (balance === 0n) {
    console.log("No MockVestingToken to transfer.");
    return;
  }

  console.log(`Transferring ${ethers.formatUnits(balance, await mockVestingToken.decimals())} MockVestingToken to ${mockVestingSafeWallet}...`);
  const tx = await mockVestingToken.transfer(mockVestingSafeWallet, balance);
  await tx.wait();

  console.log("Transfer successful! Transaction hash:", tx.hash);

  const safeBalance = await mockVestingToken.balanceOf(mockVestingSafeWallet);
  console.log(`MOCK_VESTING_SAFE_WALLET MockVestingToken balance: ${ethers.formatUnits(safeBalance, await mockVestingToken.decimals())}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
