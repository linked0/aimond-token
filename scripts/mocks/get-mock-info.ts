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
    console.log("mockVestingAddress: ", mockVestingAddress)

    const aimondTokenAddress = process.env.AIMOND_ADDRESS;
    if (!aimondTokenAddress) {
        throw new Error("AIMOND_ADDRESS not found in .env file.");
    }
    console.log("aimondTokenAddress: ", aimondTokenAddress)

    const mockVestingSafeWallet = process.env.MOCK_VESTING_SAFE_WALLET;
    if (!mockVestingSafeWallet) {
        throw new Error("MOCK_VESTING_SAFE_WALLET not found in .env file.");
    }

    const MockVestingToken = await ethers.getContractFactory("MockVestingToken");
    const mockVestingToken = MockVestingToken.attach(mockVestingAddress);

    const AimondToken = await ethers.getContractFactory("AimondToken");
    const aimondToken = AimondToken.attach(aimondTokenAddress);

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

    const aimondBalance = await aimondToken.balanceOf(mockVestingAddress);
    const aimondDecimals = await aimondToken.decimals();
    console.log(`Aimond Token Balance: ${ethers.formatUnits(aimondBalance, aimondDecimals)}`);

    const allowance = await aimondToken.allowance(deployer.address, mockVestingSafeWallet);
    console.log(`Allowance for MOCK_VESTING_SAFE_WALLET: ${ethers.formatUnits(allowance, aimondDecimals)}`);

    const cliffDuration = await mockVestingToken.cliffDurationInSeconds();
    const vestingDuration = await mockVestingToken.vestingDurationInSeconds();
    const installmentCount = await mockVestingToken.installmentCount();
    const beneficiariesCount = await mockVestingToken.beneficiariesCount();
    console.log(`\n--- Vesting Parameters ---`);
    console.log(`Cliff Duration: ${cliffDuration} seconds`);
    console.log(`Vesting Duration: ${vestingDuration} seconds`);
    console.log(`Installment Count: ${installmentCount}`);
    console.log(`Beneficiaries Count: ${beneficiariesCount}`);

    console.log(`--------------------------`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
