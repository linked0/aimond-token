import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Getting MockVestingToken info with the account:", deployer.address);

    const mockVestingAddress = process.env.MOCK_VESTING_ADDRESS;
    if (!mockVestingAddress) {
        throw new Error("MOCK_VESTING_ADDRESS not found in .env file.");
    }

    const MockVestingToken = await ethers.getContractFactory("MockVestingToken");
    const mockVestingToken = MockVestingToken.attach(mockVestingAddress);

    console.log(`\n--- MockVestingToken Info ---`);
    console.log(`Contract Address: ${mockVestingAddress}`);

    const owner = await mockVestingToken.owner();
    console.log(`Owner: ${owner}`);

    const name = await mockVestingToken.name();
    const symbol = await mockVestingToken.symbol();
    const decimals = await mockVestingToken.decimals();
    const totalSupply = await mockVestingToken.totalSupply();
    console.log(`Token Name: ${name} (${symbol})`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);

    const cliffDuration = await mockVestingToken.cliffDurationInSeconds();
    const vestingDuration = await mockVestingToken.vestingDurationInSeconds();
    const installmentCount = await mockVestingToken.installmentCount();
    console.log(`\n--- Vesting Parameters ---`);
    console.log(`Cliff Duration: ${cliffDuration} seconds`);
    console.log(`Vesting Duration: ${vestingDuration} seconds`);
    console.log(`Installment Count: ${installmentCount}`);

    console.log(`--------------------------`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
