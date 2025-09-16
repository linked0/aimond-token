import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Getting MockVestingToken schedule info with the account:", deployer.address);

    const mockVestingAddress = process.env.MOCK_VESTING_ADDRESS;
    if (!mockVestingAddress) {
        throw new Error("MOCK_VESTING_ADDRESS not found in .env file.");
    }

    const mockVestingRecipient = process.env.MOCK_VESTING_RECIPIENT;
    if (!mockVestingRecipient) {
        throw new Error("MOCK_VESTING_RECIPIENT not found in .env file.");
    }

    const MockVestingToken = await ethers.getContractFactory("MockVestingToken");
    const mockVestingToken = MockVestingToken.attach(mockVestingAddress);

    console.log(`\n--- Vesting Schedule for ${mockVestingRecipient} ---`);

    const schedule = await mockVestingToken.vestingSchedules(mockVestingRecipient);

    if (schedule.totalAmount === 0n) {
        console.log("No vesting schedule found for this recipient.");
    } else {
        const name = await mockVestingToken.name();
        const decimals = await mockVestingToken.decimals();

        console.log(`Total Amount: ${ethers.formatUnits(schedule.totalAmount, decimals)} ${name}`);
        console.log(`Total Vesting Duration: ${schedule.totalVestingDuration} seconds`);
        console.log(`Cliff Duration: ${schedule.cliffDuration} seconds`);
        console.log(`Release Duration: ${schedule.releaseDuration} seconds`);
        console.log(`Installment Count: ${schedule.installmentCount}`);
        console.log(`Released Amount: ${ethers.formatUnits(schedule.releasedAmount, decimals)} ${name}`);

        const currentlyReleasable = await mockVestingToken.getCurrentlyReleasableAmount(mockVestingRecipient);
        console.log(`Currently Releasable Amount: ${ethers.formatUnits(currentlyReleasable, decimals)} ${name}`);
    }

    console.log(`------------------------------------------------`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });