import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

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

async function main() {
    const envFile = process.env.ENV_FILE || ".env";
    console.log(`Loading environment variables from ${envFile}`);
    dotenv.config({ path: envFile });

    const networkName = network.name;
    console.log(`Setting global start time for ${networkName} network`);
    
    await setGlobalStartTime();

    console.log("\nGlobal start time setup finished successfully!");
}

main().catch((error) => {
  console.error("An error occurred during global start time setup:", error);
  process.exit(1);
});