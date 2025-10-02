import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
import { parseUnits, MaxUint256 } from "ethers";
import fs from 'fs';
import path from 'path';

dotenv.config({ path: process.env.ENV_FILE || ".env" });

async function fundLoyaltyPoint() {
    console.log("\n--- Funding Loyalty Point ---");
    const [deployer] = await ethers.getSigners();
    console.log("Funding LoyaltyPoint contract with the account:", deployer.address);

    const aimondAddress = process.env.AIMOND_ADDRESS;
    if (!aimondAddress) throw new Error("AIMOND_ADDRESS not found in .env file");

    const loyaltyPointAddress = process.env.LOYALTY_POINT_ADDRESS;
    if (!loyaltyPointAddress) throw new Error("LOYALTY_POINT_ADDRESS not found in .env file");

    const loyaltyPointFund = process.env.LOYALTY_POINT_FUND_AMOUNT;
    if (!loyaltyPointFund) throw new Error("LOYALTY_POINT_FUND_AMOUNT not found in .env file");

    const aimondToken = await ethers.getContractAt("AimondToken", aimondAddress);
    const amountToFund = parseUnits(loyaltyPointFund, 18);

    console.log(`Attempting to transfer ${loyaltyPointFund} Aimond tokens to ${loyaltyPointAddress}`);
    const tx = await aimondToken.transfer(loyaltyPointAddress, amountToFund);
    await tx.wait();
    console.log(`Successfully transferred ${loyaltyPointFund} Aimond tokens to ${loyaltyPointAddress}`);
}

async function fundMockToken() {
    console.log("\n--- Funding Mock Vesting Token ---");
    const [deployer] = await ethers.getSigners();
    console.log("Funding MockVestingToken contract with the account:", deployer.address);

    const aimondAddress = process.env.AIMOND_ADDRESS;
    if (!aimondAddress) throw new Error("AIMOND_ADDRESS not found in .env file");

    const mockVestingAddress = process.env.MOCK_VESTING_ADDRESS;
    if (!mockVestingAddress) throw new Error("MOCK_VESTING_ADDRESS not found in .env file.");

    const mockVestingFund = process.env.MOCK_VESTING_FUND_AMOUNT || "1000000";

    const aimondToken = await ethers.getContractAt("AimondToken", aimondAddress);
    const amountToFund = parseUnits(mockVestingFund, 18);

    console.log(`Attempting to transfer ${mockVestingFund} Aimond tokens to ${mockVestingAddress}`);
    const tx = await aimondToken.transfer(mockVestingAddress, amountToFund);
    await tx.wait();
    console.log(`Successfully transferred ${mockVestingFund} Aimond tokens to ${mockVestingAddress}`);
}

async function transferVestingTokensToSafe() {
    console.log("\n--- Transferring Vesting Tokens to Safe Wallet ---");
    const [deployer] = await ethers.getSigners();
    console.log("Transferring vesting tokens to safe wallet with the account:", deployer.address);

    // Transfer MockVestingToken
    const mockVestingAddress = process.env.MOCK_VESTING_ADDRESS;
    if (mockVestingAddress) {
        console.log("\n--- Transferring Mock Vesting Token to Safe Wallet ---");
        const mockVestingSafeWallet = process.env.MOCK_VESTING_SAFE_WALLET;
        if (!mockVestingSafeWallet) throw new Error("MOCK_VESTING_SAFE_WALLET not found in .env file.");

        const MockVestingToken = await ethers.getContractFactory("MockVestingToken");
        const mockVestingToken = MockVestingToken.attach(mockVestingAddress);

        const balance = await mockVestingToken.balanceOf(deployer.address);
        const decimals = await mockVestingToken.decimals();
        console.log(`Deployer MockVestingToken balance: ${ethers.formatUnits(balance, decimals)}`);

        if (balance > 0n) {
            console.log(`Transferring ${ethers.formatUnits(balance, decimals)} MockVestingToken to ${mockVestingSafeWallet}...`);
            const tx = await mockVestingToken.transfer(mockVestingSafeWallet, balance);
            await tx.wait();
            console.log("Transfer successful! Transaction hash:", tx.hash);
            const safeBalance = await mockVestingToken.balanceOf(mockVestingSafeWallet);
            console.log(`MOCK_VESTING_SAFE_WALLET MockVestingToken balance: ${ethers.formatUnits(safeBalance, decimals)}`);
        } else {
            console.log("No MockVestingToken to transfer.");
        }
    } else {
        console.log("MOCK_VESTING_ADDRESS not found in .env file. Skipping MockVestingToken transfer.");
    }

    // TODO: Implement for other vesting contracts (Investor/Founder/Employee)
    console.log("\n--- Investor/Founder/Employee Vesting Tokens ---");
    console.log("SHOULD BE IMPLEMENTED LATER");
}

async function changeMockOwner() {
    console.log("\n--- Changing Mock Vesting Owner and Approving ---");
    const [deployer] = await ethers.getSigners();
    console.log("Calling functions with the account:", deployer.address);

    const mockVestingAddress = process.env.MOCK_VESTING_ADDRESS;
    if (!mockVestingAddress) throw new Error("MOCK_VESTING_ADDRESS not found in .env file.");
    console.log("Using MOCK_VESTING_ADDRESS:", mockVestingAddress);

    const newOwner = process.env.MOCK_VESTING_SAFE_WALLET;
    if (!newOwner) throw new Error("MOCK_VESTING_SAFE_WALLET not found in .env file.");

    const aimondTokenAddress = process.env.AIMOND_ADDRESS;
    if (!aimondTokenAddress) throw new Error("AIMOND_ADDRESS not found in .env file.");

    const AimondToken = await ethers.getContractFactory("AimondToken");
    const aimondToken = AimondToken.attach(aimondTokenAddress);

    console.log(`Approving ${newOwner} to spend the maximum amount of AIMOND tokens...`);
    const approveTx = await aimondToken.approve(newOwner, MaxUint256);
    await approveTx.wait();
    console.log("Approval successful! Transaction hash:", approveTx.hash);

    const MockVestingToken = await ethers.getContractFactory("MockVestingToken");
    const mockVestingToken = MockVestingToken.attach(mockVestingAddress);

    const currentOwner = await mockVestingToken.owner();
    console.log(`Current owner of MockVestingToken: ${currentOwner}`);
    console.log(`New owner: ${newOwner}`);

    if (currentOwner.toLowerCase() !== newOwner.toLowerCase()) {
        const tx = await mockVestingToken.transferOwnership(newOwner);
        await tx.wait();
        console.log("Ownership transferred successfully! Transaction hash:", tx.hash);
        const updatedOwner = await mockVestingToken.owner();
        console.log(`Verified new owner: ${updatedOwner}`);
    } else {
        console.log("New owner is the same as the current owner. No ownership change needed.");
    }
}

async function setGlobalStartTime() {
    console.log("\n--- Setting Global Start Time ---");
    const [deployer] = await ethers.getSigners();
    console.log("Setting global start time with the account:", deployer.address);

    const globalStartTime = process.env.GLOBAL_START_TIME;
    if (!globalStartTime) throw new Error("GLOBAL_START_TIME not found in .env file");

    const startTime = parseInt(globalStartTime);
    console.log(`Setting global start time to: ${startTime} (${new Date(startTime * 1000).toISOString()})`);

    // Set global start time for all vesting contracts
    const contracts = [
        { name: "MockVestingToken", address: process.env.MOCK_VESTING_ADDRESS },
        { name: "EmployeeVestingToken", address: process.env.EMPLOYEE_VESTING_ADDRESS },
        { name: "FounderVestingToken", address: process.env.FOUNDER_VESTING_ADDRESS },
        { name: "InvestorVestingToken", address: process.env.INVESTOR_VESTING_ADDRESS }
    ];

    for (const contract of contracts) {
        if (!contract.address) {
            console.log(`Skipping ${contract.name} - address not found in .env`);
            continue;
        }

        try {
            console.log(`Setting global start time for ${contract.name} at ${contract.address}...`);
            const contractInstance = await ethers.getContractAt(contract.name, contract.address);
            const tx = await contractInstance.setGlobalStartTime(startTime);
            await tx.wait();
            console.log(`✓ Successfully set global start time for ${contract.name}. Transaction hash: ${tx.hash}`);
        } catch (error) {
            console.error(`✗ Failed to set global start time for ${contract.name}:`, error.message);
        }
    }
}

function generateAbis() {
    console.log("\n--- Generating ABIs ---");
    
    const getAbi = (contractName: string) => {
        try {
          const dir = path.resolve(__dirname, `../artifacts/contracts/${contractName}.sol`);
          const file = fs.readFileSync(`${dir}/${contractName}.json`, 'utf8');
          const json = JSON.parse(file);
          return json.abi;
        } catch (e) {
          console.error('Failed to load ABI for contract:', contractName, e)
        }
      };
      
      const getMockAbi = (contractName: string) => {
          try {
            const dir = path.resolve(__dirname, `../artifacts/contracts/mocks/${contractName}.sol`);
            const file = fs.readFileSync(`${dir}/${contractName}.json`, 'utf8');
            const json = JSON.parse(file);
            return json.abi;
          } catch (e) {
            console.error('Failed to load mock ABI for contract:', contractName, e);
          }
        };
      
      const loyaltyPointABI = getAbi('LoyaltyPoint');
      const employeeVestingABI = getAbi('EmployeeVestingToken');
      const founderVestingABI = getAbi('FounderVestingToken');
      const investorVestingABI = getAbi('InvestorVestingToken');
      const mockVestingABI = getMockAbi('MockVestingToken');
      
      const content = `export const loyaltyPointAddress = process.env.REACT_APP_LOYALTY_POINT_ADDRESS || "0x...DEFAULT_CONTRACT_ADDRESS_HERE"; // TODO: Replace with your contract address or provide a default
      export const employeeVestingAddress = process.env.REACT_APP_EMPLOYEE_VESTING_ADDRESS || "0x...EMPLOYEE_VESTING_ADDRESS_HERE";
      export const founderVestingAddress = process.env.REACT_APP_FOUNDER_VESTING_ADDRESS || "0x...FOUNDER_VESTING_ADDRESS_HERE";
      export const investorVestingAddress = process.env.REACT_APP_INVESTOR_VESTING_ADDRESS || "0x...INVESTOR_VESTING_ADDRESS_HERE";
      export const mockVestingAddress = process.env.REACT_APP_MOCK_VESTING_ADDRESS || "0x...MOCK_VESTING_ADDRESS_HERE";
      
      export const loyaltyPointABI = ${JSON.stringify(loyaltyPointABI, null, 2)} as const;
      
      export const employeeVestingABI = ${JSON.stringify(employeeVestingABI, null, 2)} as const;
      
      export const founderVestingABI = ${JSON.stringify(founderVestingABI, null, 2)} as const;
      
      export const investorVestingABI = ${JSON.stringify(investorVestingABI, null, 2)} as const;
      
      export const mockVestingABI = ${JSON.stringify(mockVestingABI, null, 2)} as const;
      `;
      
      fs.writeFileSync(path.resolve(__dirname, '../contracts.ts'), content);
      console.log("Successfully generated ABIs and contract addresses.");
}


async function main() {
    const envFile = process.env.ENV_FILE || ".env";
    console.log(`Loading environment variables from ${envFile}`);
    dotenv.config({ path: envFile });

    const networkName = network.name;
    console.log(`Getting all info for ${networkName} network`);

    await fundLoyaltyPoint();
    await fundMockToken();
    await setGlobalStartTime();
    await transferVestingTokensToSafe();
    await changeMockOwner();
    generateAbis();

    console.log("\nAll setup scripts finished successfully!");
}

main().catch((error) => {
  console.error("An error occurred during project setup:", error);
  process.exit(1);
});
