import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config({ path: process.env.ENV_FILE || ".env" });

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Calling functions with the account:", deployer.address);

    const mockVestingAddress = process.env.MOCK_VESTING_ADDRESS;
    if (!mockVestingAddress) {
        throw new Error("MOCK_VESTING_ADDRESS not found in .env file.");
    }

    const newOwner = process.env.MOCK_VESTING_SAFE_WALLET;
    if (!newOwner) {
        throw new Error("MOCK_VESTING_SAFE_WALLET not found in .env file.");
    }

    const aimondTokenAddress = process.env.AIMOND_ADDRESS;
    if (!aimondTokenAddress) {
        throw new Error("AIMOND_ADDRESS not found in .env file.");
    }

    const AimondToken = await ethers.getContractFactory("AimondToken");
    const aimondToken = AimondToken.attach(aimondTokenAddress);

    console.log(`Approving ${newOwner} to spend the maximum amount of AIMOND tokens...`);
    const approveTx = await aimondToken.approve(newOwner, ethers.MaxUint256);
    await approveTx.wait();
    console.log("Approval successful! Transaction hash:", approveTx.hash);


    const MockVestingToken = await ethers.getContractFactory("MockVestingToken");
    const mockVestingToken = MockVestingToken.attach(mockVestingAddress);

    console.log(`MockVestingToken address: ${mockVestingAddress}`)
    const currentOwner = await mockVestingToken.owner();
    console.log(`Current owner of MockVestingToken: ${currentOwner}`);
    console.log(`New owner: ${newOwner}`);

    if (currentOwner.toLowerCase() === newOwner.toLowerCase()) {
        console.log("New owner is the same as the current owner. No ownership change needed.");
    } else {
        const tx = await mockVestingToken.transferOwnership(newOwner);
        await tx.wait();

        console.log("Ownership transferred successfully!");
        console.log("Transaction hash:", tx.hash);

        const updatedOwner = await mockVestingToken.owner();
        console.log(`Verified new owner: ${updatedOwner}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
