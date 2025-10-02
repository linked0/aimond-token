import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

async function transferTokensToSafe(contractName: string, contractAddress: string, safeWallet: string) {
    console.log(`\n--- Transferring ${contractName} to Safe Wallet ---`);
    
    const ContractFactory = await ethers.getContractFactory(contractName);
    const contract = ContractFactory.attach(contractAddress);
    
    const [deployer] = await ethers.getSigners();
    const balance = await contract.balanceOf(deployer.address);
    const decimals = await contract.decimals();
    
    console.log(`Deployer ${contractName} balance: ${ethers.formatUnits(balance, decimals)}`);
    
    if (balance > 0n) {
        console.log(`Transferring ${ethers.formatUnits(balance, decimals)} ${contractName} to ${safeWallet}...`);
        const tx = await contract.transfer(safeWallet, balance);
        await tx.wait();
        console.log(`✓ Transfer successful! Transaction hash: ${tx.hash}`);
        
        const safeBalance = await contract.balanceOf(safeWallet);
        console.log(`Safe wallet ${contractName} balance: ${ethers.formatUnits(safeBalance, decimals)}`);
    } else {
        console.log(`No ${contractName} to transfer.`);
    }
}

async function transferVestingTokensToSafe() {
    console.log("\n--- Transferring Vesting Tokens to Safe Wallet ---");
    const [deployer] = await ethers.getSigners();
    console.log("Transferring vesting tokens to safe wallet with the account:", deployer.address);

    const safeWallet = process.env.MOCK_VESTING_SAFE_WALLET;
    if (!safeWallet) throw new Error("MOCK_VESTING_SAFE_WALLET not found in .env file.");

    // List of vesting contracts to transfer
    const vestingContracts = [
        { name: "MockVestingToken", address: process.env.MOCK_VESTING_ADDRESS },
        { name: "EmployeeVestingToken", address: process.env.EMPLOYEE_VESTING_ADDRESS },
        { name: "FounderVestingToken", address: process.env.FOUNDER_VESTING_ADDRESS },
        { name: "InvestorVestingToken", address: process.env.INVESTOR_VESTING_ADDRESS }
    ];

    // Transfer tokens for each contract
    for (const contract of vestingContracts) {
        if (!contract.address) {
            console.log(`⚠️  Skipping ${contract.name} - address not found in .env`);
            continue;
        }

        try {
            await transferTokensToSafe(contract.name, contract.address, safeWallet);
        } catch (error) {
            console.error(`✗ Failed to transfer ${contract.name}:`, error.message);
        }
    }
}

async function main() {
    const envFile = process.env.ENV_FILE || ".env";
    console.log(`Loading environment variables from ${envFile}`);
    dotenv.config({ path: envFile });

    const networkName = network.name;
    console.log(`Running transfer tokens script for ${networkName} network`);

    try {
        await transferVestingTokensToSafe();
        console.log("\n✓ Transfer tokens script finished successfully!");
    } catch (error) {
        console.error("An error occurred during transfer tokens:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("An error occurred during script execution:", error);
    process.exit(1);
});