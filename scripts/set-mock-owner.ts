import { ethers, network } from "hardhat";
import { MaxUint256 } from "ethers";
import * as dotenv from "dotenv";

async function setMockVestingOwner() {
    console.log("\n--- Setting Mock Vesting Token Owner ---");
    const [deployer] = await ethers.getSigners();
    console.log("Setting MockVestingToken owner with the account:", deployer.address);

    const mockVestingAddress = process.env.MOCK_VESTING_ADDRESS;
    if (!mockVestingAddress) {
        throw new Error("MOCK_VESTING_ADDRESS not found in .env file.");
    }
    console.log("Using MOCK_VESTING_ADDRESS:", mockVestingAddress);

    const newOwner = process.env.MOCK_VESTING_SAFE_WALLET;
    if (!newOwner) {
        throw new Error("MOCK_VESTING_SAFE_WALLET not found in .env file.");
    }
    console.log("New owner:", newOwner);

    const aimondTokenAddress = process.env.AIMOND_ADDRESS;
    if (!aimondTokenAddress) {
        throw new Error("AIMOND_ADDRESS not found in .env file.");
    }

    // Approve new owner to spend AIMOND tokens
    console.log(`\n--- Approving ${newOwner} to spend AIMOND tokens ---`);
    const AimondToken = await ethers.getContractFactory("AimondToken");
    const aimondToken = AimondToken.attach(aimondTokenAddress);
    
    console.log(`Approving ${newOwner} to spend the maximum amount of AIMOND tokens...`);
    const approveTx = await aimondToken.approve(newOwner, MaxUint256);
    await approveTx.wait();
    console.log("✓ Approval successful! Transaction hash:", approveTx.hash);

    // Change ownership of MockVestingToken
    console.log(`\n--- Changing MockVestingToken Ownership ---`);
    const MockVestingToken = await ethers.getContractFactory("MockVestingToken");
    const mockVestingToken = MockVestingToken.attach(mockVestingAddress);

    const currentOwner = await mockVestingToken.owner();
    console.log(`Current owner of MockVestingToken: ${currentOwner}`);
    console.log(`New owner: ${newOwner}`);

    if (currentOwner.toLowerCase() !== newOwner.toLowerCase()) {
        const tx = await mockVestingToken.transferOwnership(newOwner);
        await tx.wait();
        console.log("✓ Ownership transferred successfully! Transaction hash:", tx.hash);
        const updatedOwner = await mockVestingToken.owner();
        console.log(`Verified new owner: ${updatedOwner}`);
    } else {
        console.log("✓ New owner is the same as the current owner. No ownership change needed.");
    }
}

async function main() {
    const envFile = process.env.ENV_FILE || ".env";
    console.log(`Loading environment variables from ${envFile}`);
    dotenv.config({ path: envFile });

    const networkName = network.name;
    console.log(`Running set mock owner script for ${networkName} network`);

    try {
        await setMockVestingOwner();
        console.log("\n✓ Set mock owner script finished successfully!");
    } catch (error) {
        console.error("An error occurred during set mock owner:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("An error occurred during script execution:", error);
    process.exit(1);
});