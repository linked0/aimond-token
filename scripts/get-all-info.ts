import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
import { formatUnits } from "ethers";

async function getLoyaltyInfo() {
    console.log("\n--- Loyalty Point Info ---");

    const aimondAddress = process.env.AIMOND_ADDRESS;
    if (!aimondAddress) throw new Error("AIMOND_ADDRESS not found in .env file");

    const loyaltyPointAddress = process.env.LOYALTY_POINT_ADDRESS;
    if (!loyaltyPointAddress) throw new Error("LOYALTY_POINT_ADDRESS not found in .env file");
    console.log("Loyalty Point Address:", loyaltyPointAddress);

    const recipient1Address = process.env.LOYALTY_POINT_RECIPIENT_1;
    if (!recipient1Address) throw new Error("LOYALTY_POINT_RECIPIENT_1 not found in .env file");

    const recipient2Address = process.env.LOYALTY_POINT_RECIPIENT_2;
    if (!recipient2Address) throw new Error("LOYALTY_POINT_RECIPIENT_2 not found in .env file");
    
    const loyaltyPointAdminKey = process.env.LOYALTY_POINT_ADMIN_KEY;
    if (!loyaltyPointAdminKey) throw new Error("LOYALTY_POINT_ADMIN_KEY not found in .env file");

    const loyaltyPoint = await ethers.getContractAt("LoyaltyPoint", loyaltyPointAddress);
    const aimondToken = await ethers.getContractAt("AimondToken", aimondAddress);
    
    const tokenAddress = await loyaltyPoint.amdToken();
    console.log(`Aimond Token address in LoyaltyPoint contract: ${tokenAddress}`);

    const balance1 = await aimondToken.balanceOf(recipient1Address);
    const balance2 = await aimondToken.balanceOf(recipient2Address);
    const loyaltyPointBalance = await aimondToken.balanceOf(loyaltyPointAddress);

    console.log(`Aimond Token balance for ${recipient1Address}: ${formatUnits(balance1, 18)}`);
    console.log(`Aimond Token balance for ${recipient2Address}: ${formatUnits(balance2, 18)}`);
    console.log(`Aimond Token balance for LoyaltyPoint contract (${loyaltyPointAddress}): ${formatUnits(loyaltyPointBalance, 18)}`);

    const loyaltyPointAdminWallet = new ethers.Wallet(loyaltyPointAdminKey);
    const loyaltyPointAdminAddress = loyaltyPointAdminWallet.address;
    const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
    const isAdmin = await loyaltyPoint.hasRole(ADMIN_ROLE, loyaltyPointAdminAddress);
    console.log(`Is ${loyaltyPointAdminAddress} an admin? ${isAdmin}`);
}

async function getMockInfo() {
    console.log("\n--- Mock Vesting Info ---");
    const [deployer] = await ethers.getSigners();

    const mockVestingAddress = process.env.MOCK_VESTING_ADDRESS;
    if (!mockVestingAddress) throw new Error("MOCK_VESTING_ADDRESS not found in .env file.");

    const aimondTokenAddress = process.env.AIMOND_ADDRESS;
    if (!aimondTokenAddress) throw new Error("AIMOND_ADDRESS not found in .env file.");

    const mockVestingSafeWallet = process.env.MOCK_VESTING_SAFE_WALLET;
    if (!mockVestingSafeWallet) throw new Error("MOCK_VESTING_SAFE_WALLET not found in .env file.");
    
    const mockVestingRecipient = process.env.MOCK_VESTING_RECIPIENT;
    if (!mockVestingRecipient) throw new Error("MOCK_VESTING_RECIPIENT not found in .env file.");

    const MockVestingToken = await ethers.getContractFactory("MockVestingToken");
    const mockVestingToken = MockVestingToken.attach(mockVestingAddress);

    const AimondToken = await ethers.getContractFactory("AimondToken");
    const aimondToken = AimondToken.attach(aimondTokenAddress);

    console.log(`Contract Address: ${mockVestingAddress}`);
    const owner = await mockVestingToken.owner();
    console.log(`Owner: ${owner}`);
    const name = await mockVestingToken.name();
    const symbol = await mockVestingToken.symbol();
    const decimals = await mockVestingToken.decimals();
    const totalSupply = await mockVestingToken.totalSupply();
    console.log(`Token Name: ${name} (${symbol})`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Total Supply: ${formatUnits(totalSupply, decimals)}`);
    const aimondBalance = await aimondToken.balanceOf(mockVestingAddress);
    const aimondDecimals = await aimondToken.decimals();
    console.log(`Aimond Token Balance: ${formatUnits(aimondBalance, aimondDecimals)}`);
    const allowance = await aimondToken.allowance(deployer.address, mockVestingSafeWallet);
    console.log(`Allowance for MOCK_VESTING_SAFE_WALLET: ${formatUnits(allowance, aimondDecimals)}`);
    
    console.log(`\n--- Vesting Parameters ---

`);
    const cliffDuration = await mockVestingToken.cliffDurationInSeconds();
    const vestingDuration = await mockVestingToken.vestingDurationInSeconds();
    const installmentCount = await mockVestingToken.installmentCount();
    const beneficiariesCount = await mockVestingToken.beneficiariesCount();
    console.log(`Cliff Duration: ${cliffDuration} seconds`);
    console.log(`Vesting Duration: ${vestingDuration} seconds`);
    console.log(`Installment Count: ${installmentCount}`);
    console.log(`Beneficiaries Count: ${beneficiariesCount}`);

    console.log(`\n--- Vesting Schedule for ${mockVestingRecipient} ---

`);
    const schedule = await mockVestingToken.vestingSchedules(mockVestingRecipient);
    if (schedule.totalAmount === 0n) {
        console.log("No vesting schedule found for this recipient.");
    } else {
        const tokenName = await mockVestingToken.name();
        const tokenDecimals = await mockVestingToken.decimals();
        console.log(`Total Amount: ${formatUnits(schedule.totalAmount, tokenDecimals)} ${tokenName}`);
        console.log(`Total Vesting Duration: ${schedule.totalVestingDuration} seconds`);
        console.log(`Cliff Duration: ${schedule.cliffDuration} seconds`);
        console.log(`Release Duration: ${schedule.releaseDuration} seconds`);
        console.log(`Installment Count: ${schedule.installmentCount}`);
        console.log(`Released Amount: ${formatUnits(schedule.releasedAmount, tokenDecimals)} ${tokenName}`);
        const currentlyReleasable = await mockVestingToken.getCurrentlyReleasableAmount(mockVestingRecipient);
        console.log(`Currently Releasable Amount: ${formatUnits(currentlyReleasable, tokenDecimals)} ${tokenName}`);
    }
    console.log(`------------------------------------------------`);
}


async function main() {
    const envFile = process.env.ENV_FILE || ".env";
    console.log(`Loading environment variables from ${envFile}`);
    dotenv.config({ path: envFile });

    const networkName = network.name;
    console.log(`Getting all info for ${networkName} network`);
    
    await getLoyaltyInfo();
    await getMockInfo();

    console.log("\nAll info scripts finished successfully!");
}

main().catch((error) => {
  console.error("An error occurred during info gathering:", error);
  process.exit(1);
});
