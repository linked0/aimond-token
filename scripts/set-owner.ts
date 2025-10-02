import { ethers, network } from "hardhat";
import { MaxUint256 } from "ethers";
import * as dotenv from "dotenv";

async function setOwnerForContract(contractName: string, contractAddress: string, newOwner: string) {
    console.log(`\n--- Changing ${contractName} Owner ---`);
    
    const ContractFactory = await ethers.getContractFactory(contractName);
    const contract = ContractFactory.attach(contractAddress);
    
    const currentOwner = await contract.owner();
    console.log(`Current owner of ${contractName}: ${currentOwner}`);
    console.log(`New owner: ${newOwner}`);
    
    if (currentOwner.toLowerCase() !== newOwner.toLowerCase()) {
        const tx = await contract.transferOwnership(newOwner);
        await tx.wait();
        console.log(`✓ Ownership transferred successfully for ${contractName}! Transaction hash: ${tx.hash}`);
        const updatedOwner = await contract.owner();
        console.log(`Verified new owner: ${updatedOwner}`);
    } else {
        console.log(`✓ New owner is the same as the current owner for ${contractName}. No ownership change needed.`);
    }
}

async function setVestingTokenOwners() {
    console.log("\n--- Setting Vesting Token Owners ---");
    const [deployer] = await ethers.getSigners();
    console.log("Setting owners with the account:", deployer.address);

    const newOwner = process.env.MOCK_VESTING_SAFE_WALLET;
    if (!newOwner) throw new Error("MOCK_VESTING_SAFE_WALLET not found in .env file.");

    const aimondTokenAddress = process.env.AIMOND_ADDRESS;
    if (!aimondTokenAddress) throw new Error("AIMOND_ADDRESS not found in .env file.");

    // Approve new owner to spend AIMOND tokens
    console.log(`\n--- Approving ${newOwner} to spend AIMOND tokens ---`);
    const AimondToken = await ethers.getContractFactory("AimondToken");
    const aimondToken = AimondToken.attach(aimondTokenAddress);
    
    console.log(`Approving ${newOwner} to spend the maximum amount of AIMOND tokens...`);
    const approveTx = await aimondToken.approve(newOwner, MaxUint256);
    await approveTx.wait();
    console.log("✓ Approval successful! Transaction hash:", approveTx.hash);

    // List of vesting contracts to change ownership
    const vestingContracts = [
        { name: "MockVestingToken", address: process.env.MOCK_VESTING_ADDRESS },
        { name: "EmployeeVestingToken", address: process.env.EMPLOYEE_VESTING_ADDRESS },
        { name: "FounderVestingToken", address: process.env.FOUNDER_VESTING_ADDRESS },
        { name: "InvestorVestingToken", address: process.env.INVESTOR_VESTING_ADDRESS }
    ];

    // Change ownership for each contract
    for (const contract of vestingContracts) {
        if (!contract.address) {
            console.log(`⚠️  Skipping ${contract.name} - address not found in .env`);
            continue;
        }

        try {
            await setOwnerForContract(contract.name, contract.address, newOwner);
        } catch (error) {
            console.error(`✗ Failed to change ownership for ${contract.name}:`, error.message);
        }
    }
}

async function main() {
    const envFile = process.env.ENV_FILE || ".env";
    console.log(`Loading environment variables from ${envFile}`);
    dotenv.config({ path: envFile });

    const networkName = network.name;
    console.log(`Running set owner script for ${networkName} network`);

    try {
        await setVestingTokenOwners();
        console.log("\n✓ Set owner script finished successfully!");
    } catch (error) {
        console.error("An error occurred during set owner:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("An error occurred during script execution:", error);
    process.exit(1);
});