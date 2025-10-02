import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

async function transferMockTokensToSafe() {
    console.log("\n--- Transferring Mock Vesting Token to Safe Wallet ---");
    const [deployer] = await ethers.getSigners();
    console.log("Transferring MockVestingToken with the account:", deployer.address);

    const mockVestingAddress = process.env.MOCK_VESTING_ADDRESS;
    if (!mockVestingAddress) {
        throw new Error("MOCK_VESTING_ADDRESS not found in .env file.");
    }
    console.log("Using MOCK_VESTING_ADDRESS:", mockVestingAddress);

    const safeWallet = process.env.MOCK_VESTING_SAFE_WALLET;
    if (!safeWallet) {
        throw new Error("MOCK_VESTING_SAFE_WALLET not found in .env file.");
    }
    console.log("Transferring to safe wallet:", safeWallet);

    // Check if the contract exists at the address
    const code = await ethers.provider.getCode(mockVestingAddress);
    if (code === "0x") {
        throw new Error(`No contract found at address ${mockVestingAddress}. Please deploy the MockVestingToken contract first.`);
    }

    const MockVestingToken = await ethers.getContractFactory("MockVestingToken");
    const mockVestingToken = MockVestingToken.attach(mockVestingAddress);

    try {
        const balance = await mockVestingToken.balanceOf(deployer.address);
        const decimals = await mockVestingToken.decimals();
        console.log(`Deployer MockVestingToken balance: ${ethers.formatUnits(balance, decimals)}`);

        if (balance > 0n) {
            console.log(`Transferring ${ethers.formatUnits(balance, decimals)} MockVestingToken to ${safeWallet}...`);
            const tx = await mockVestingToken.transfer(safeWallet, balance);
            await tx.wait();
            console.log("✓ Transfer successful! Transaction hash:", tx.hash);
            
            const safeBalance = await mockVestingToken.balanceOf(safeWallet);
            console.log(`Safe wallet MockVestingToken balance: ${ethers.formatUnits(safeBalance, decimals)}`);
        } else {
            console.log("No MockVestingToken to transfer.");
        }
    } catch (error) {
        if (error.code === 'BAD_DATA') {
            throw new Error(`Contract at ${mockVestingAddress} exists but doesn't implement the expected interface. Please verify this is a MockVestingToken contract.`);
        }
        throw error;
    }
}

async function main() {
    const envFile = process.env.ENV_FILE || ".env";
    console.log(`Loading environment variables from ${envFile}`);
    dotenv.config({ path: envFile });

    const networkName = network.name;
    console.log(`Running transfer mock tokens script for ${networkName} network`);

    try {
        await transferMockTokensToSafe();
        console.log("\n✓ Transfer mock tokens script finished successfully!");
    } catch (error) {
        console.error("An error occurred during transfer mock tokens:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("An error occurred during script execution:", error);
    process.exit(1);
});