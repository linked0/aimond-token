import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Calling setVestingParameters with the account:", deployer.address);

    const mockVestingAddress = process.env.MOCK_VESTING_ADDRESS;
    if (!mockVestingAddress) {
        throw new Error("MOCK_VESTING_ADDRESS not found in .env file.");
    }

    const MockVestingToken = await ethers.getContractFactory("MockVestingToken");
    const mockVestingToken = MockVestingToken.attach(mockVestingAddress);

    const cliffDurationInSeconds = process.env.MOCK_CLIFF_DURATION ? parseInt(process.env.MOCK_CLIFF_DURATION) : 0;
    const vestingDurationInSeconds = process.env.MOCK_VESTING_DURATION ? parseInt(process.env.MOCK_VESTING_DURATION) : 0;
    const installmentCount = process.env.MOCK_INSTALLMENT_COUNT ? parseInt(process.env.MOCK_INSTALLMENT_COUNT) : 0;

    // It's valid for cliffDurationInSeconds to be 0, so removing the aggressive warning.
    if (vestingDurationInSeconds === 0 || installmentCount === 0) {
        console.warn("Vesting duration or installment count is set to 0. Please check your .env file.");
    }

    console.log(`Setting vesting parameters:
        Cliff Duration: ${cliffDurationInSeconds} seconds
        Vesting Duration: ${vestingDurationInSeconds} seconds
        Installment Count: ${installmentCount}`);

    const tx = await mockVestingToken.setVestingParameters(
        cliffDurationInSeconds,
        vestingDurationInSeconds,
        installmentCount
    );
    await tx.wait();

    console.log("Vesting parameters set successfully!");
    console.log("Transaction hash:", tx.hash);

    // Verify the updated values
    const updatedCliff = await mockVestingToken.cliffDurationInSeconds();
    const updatedVesting = await mockVestingToken.vestingDurationInSeconds();
    const updatedInstallment = await mockVestingToken.installmentCount();

    console.log(`Verified updated parameters:
        Cliff Duration: ${updatedCliff} seconds
        Vesting Duration: ${updatedVesting} seconds
        Installment Count: ${updatedInstallment}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
