import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
import { formatUnits, parseUnits } from "ethers";

const TYPICAL_VESTING_AMOUNT = "1000000"; // 1M tokens

async function getLoyaltyInfo() {
    console.log("\n--- Loyalty Point Info ---");

    const aimondAddress = process.env.AIMOND_ADDRESS;
    if (!aimondAddress) throw new Error("AIMOND_ADDRESS not found in .env file");

    const loyaltyPointAddress = process.env.LOYALTY_POINT_ADDRESS;
    if (!loyaltyPointAddress) {
        console.log("❌ LOYALTY_POINT_ADDRESS not found in .env file - skipping LoyaltyPoint info");
        return;
    }
    
    console.log("Loyalty Point Address:", loyaltyPointAddress);

    // Check if contract exists at this address
    const code = await ethers.provider.getCode(loyaltyPointAddress);
    if (code === "0x") {
        console.log("❌ No contract deployed at LOYALTY_POINT_ADDRESS - skipping LoyaltyPoint info");
        console.log("💡 To fix this, either:");
        console.log("   1. Deploy the LoyaltyPoint contract first");
        console.log("   2. Update LOYALTY_POINT_ADDRESS with the correct contract address");
        return;
    }

    const recipient1Address = process.env.LOYALTY_POINT_RECIPIENT_1;
    if (!recipient1Address) throw new Error("LOYALTY_POINT_RECIPIENT_1 not found in .env file");

    const recipient2Address = process.env.LOYALTY_POINT_RECIPIENT_2;
    if (!recipient2Address) throw new Error("LOYALTY_POINT_RECIPIENT_2 not found in .env file");
    
    const loyaltyPointAdminKey = process.env.LOYALTY_POINT_ADMIN_KEY;
    if (!loyaltyPointAdminKey) throw new Error("LOYALTY_POINT_ADMIN_KEY not found in .env file");

    try {
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

        // Log the merkle root
        const merkleRoot = await loyaltyPoint.merkleRoot();
        console.log(`Loyalty Point Merkle Root: ${merkleRoot}`);
    } catch (error: any) {
        console.log("❌ Failed to interact with LoyaltyPoint contract:", error.message);
        console.log("💡 The contract may not be properly deployed or may have a different ABI");
    }
}

async function getMockInfo() {
    console.log("\n--- Mock Vesting Info ---");
    const [deployer] = await ethers.getSigners();

    const mockVestingAddress = process.env.MOCK_VESTING_ADDRESS;
    if (!mockVestingAddress) {
        console.log("❌ MOCK_VESTING_ADDRESS not found in .env file - skipping Mock Vesting info");
        return;
    }

    // Check if contract exists at this address
    const code = await ethers.provider.getCode(mockVestingAddress);
    if (code === "0x") {
        console.log("❌ No contract deployed at MOCK_VESTING_ADDRESS - skipping Mock Vesting info");
        console.log("💡 To fix this, either:");
        console.log("   1. Deploy the MockVestingToken contract first");
        console.log("   2. Update MOCK_VESTING_ADDRESS with the correct contract address");
        return;
    }

    const aimondTokenAddress = process.env.AIMOND_ADDRESS;
    if (!aimondTokenAddress) throw new Error("AIMOND_ADDRESS not found in .env file.");

    const mockVestingSafeWallet = process.env.MOCK_VESTING_SAFE_WALLET;
    if (!mockVestingSafeWallet) throw new Error("MOCK_VESTING_SAFE_WALLET not found in .env file.");
    
    const mockVestingRecipient = process.env.MOCK_VESTING_RECIPIENT;
    if (!mockVestingRecipient) throw new Error("MOCK_VESTING_RECIPIENT not found in .env file.");

    try {
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
    } catch (error: any) {
        console.log("❌ Failed to interact with MockVestingToken contract:", error.message);
        console.log("💡 The contract may not be properly deployed or may have a different ABI");
    }
}

async function getVestingContractsInfo() {
    console.log("\n--- Vesting Contracts Global Start Times & Balances ---");
    
    const aimondAddress = process.env.AIMOND_ADDRESS;
    if (!aimondAddress) {
        console.log("❌ AIMOND_ADDRESS not found in .env file - cannot check balances");
        return;
    }

    // Check if Aimond token contract exists
    const aimondCode = await ethers.provider.getCode(aimondAddress);
    if (aimondCode === "0x") {
        console.log("❌ No Aimond token contract deployed at AIMOND_ADDRESS - cannot check balances");
        return;
    }

    // Define all vesting contracts
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

        // Check if contract exists at this address
        const code = await ethers.provider.getCode(contract.address);
        if (code === "0x") {
            console.log(`Skipping ${contract.name} - no contract deployed at ${contract.address}`);
            continue;
        }

        try {
            console.log(`\n--- ${contract.name} ---`);
            console.log(`Contract Address: ${contract.address}`);
            
            const contractInstance = await ethers.getContractAt(contract.name, contract.address);
            const globalStartTime = await contractInstance.globalStartTime();
            
            if (globalStartTime === 0n) {
                console.log(`Global Start Time: Not set (0)`);
            } else {
                const startTimeNumber = Number(globalStartTime);
                const startDate = new Date(startTimeNumber * 1000);
                console.log(`Global Start Time: ${globalStartTime} (${startDate.toISOString()})`);
            }

            // Get Aimond token balance for this vesting contract
            try {
                const aimondToken = await ethers.getContractAt("AimondToken", aimondAddress);
                const balance = await aimondToken.balanceOf(contract.address);
                const decimals = await aimondToken.decimals();
                console.log(`Aimond Token Balance: ${formatUnits(balance, decimals)}`);
            } catch (balanceError: any) {
                console.log(`❌ Failed to get Aimond token balance: ${balanceError.message}`);
            }

            // Get BaseVestingToken balance for the caller (owner)
            try {
                const callerAddress = process.env.MOCK_VESTING_SAFE_WALLET;
                if (callerAddress) {
                    const vestingTokenBalance = await contractInstance.balanceOf(callerAddress);
                    const vestingDecimals = await contractInstance.decimals();
                    console.log(`Caller (${callerAddress}) Balance: ${formatUnits(vestingTokenBalance, vestingDecimals)}`);
                    
                    // Check if caller has enough balance for a typical vesting amount
                    const typicalAmount = parseUnits(TYPICAL_VESTING_AMOUNT, vestingDecimals);
                    if (vestingTokenBalance >= typicalAmount) {
                        console.log(`✅ Caller has sufficient balance for vesting operations`);
                    } else {
                        console.log(`❌ Caller may not have enough balance for vesting operations`);
                        console.log(`   Need: ${formatUnits(typicalAmount, vestingDecimals)}`);
                        console.log(`   Have: ${formatUnits(vestingTokenBalance, vestingDecimals)}`);
                        console.log(`   💡 Consider using MOCK_VESTING_SAFE_WALLET for vesting operations instead`);
                    }
                }
            } catch (balanceError: any) {
                console.log(`❌ Failed to get caller balance: ${balanceError.message}`);
            }

            // Get BaseVestingToken balance for MOCK_VESTING_SAFE_WALLET (for all vesting contracts)
            try {
                const safeWalletAddress = process.env.MOCK_VESTING_SAFE_WALLET;
                if (safeWalletAddress) {
                    const safeWalletBalance = await contractInstance.balanceOf(safeWalletAddress);
                    const vestingDecimals = await contractInstance.decimals();
                    console.log(`Safe Wallet (${safeWalletAddress}) Balance: ${formatUnits(safeWalletBalance, vestingDecimals)}`);
                    
                    // Check if safe wallet has enough balance for a typical vesting amount
                    const typicalAmount = parseUnits(TYPICAL_VESTING_AMOUNT, vestingDecimals);
                    if (safeWalletBalance >= typicalAmount) {
                        console.log(`✅ Safe wallet has sufficient balance for vesting operations`);
                    } else {
                        console.log(`❌ Safe wallet may not have enough balance for vesting operations`);
                        console.log(`   Need: ${formatUnits(typicalAmount, vestingDecimals)}`);
                        console.log(`   Have: ${formatUnits(safeWalletBalance, vestingDecimals)}`);
                    }
                } else {
                    console.log(`❌ MOCK_VESTING_SAFE_WALLET not found in .env file`);
                }
            } catch (balanceError: any) {
                console.log(`❌ Failed to get safe wallet balance: ${balanceError.message}`);
            }
        } catch (error: any) {
            console.error(`✗ Failed to get info for ${contract.name}:`, error.message);
        }
    }
    
    console.log(`\n--- Expected Global Start Time from .env ---`);
    const expectedGlobalStartTime = process.env.GLOBAL_START_TIME;
    if (expectedGlobalStartTime) {
        const expectedTime = parseInt(expectedGlobalStartTime);
        const expectedDate = new Date(expectedTime * 1000);
        console.log(`Expected Global Start Time: ${expectedTime} (${expectedDate.toISOString()})`);
    } else {
        console.log("GLOBAL_START_TIME not found in .env file");
    }

    // Summary of total Aimond token balances across all vesting contracts
    console.log(`\n--- Vesting Contracts Balance Summary ---`);
    
    // Check if Aimond token contract exists for balance summary
    const aimondCodeForSummary = await ethers.provider.getCode(aimondAddress);
    if (aimondCodeForSummary === "0x") {
        console.log("❌ No Aimond token contract deployed - cannot generate balance summary");
        return;
    }

    try {
        const aimondToken = await ethers.getContractAt("AimondToken", aimondAddress);
        const decimals = await aimondToken.decimals();
        let totalVestingBalance = 0n;
        let contractsWithBalance = 0;

        for (const contract of contracts) {
            if (contract.address) {
                const code = await ethers.provider.getCode(contract.address);
                if (code !== "0x") {
                    try {
                        const balance = await aimondToken.balanceOf(contract.address);
                        totalVestingBalance += balance;
                        if (balance > 0n) {
                            contractsWithBalance++;
                        }
                    } catch (error: any) {
                        // Skip contracts that can't be queried
                    }
                }
            }
        }

        console.log(`Total Aimond tokens in all vesting contracts: ${formatUnits(totalVestingBalance, decimals)}`);
        console.log(`Contracts with non-zero balance: ${contractsWithBalance}/${contracts.length}`);
        
        // Also show LoyaltyPoint balance if it exists
        const loyaltyPointAddress = process.env.LOYALTY_POINT_ADDRESS;
        if (loyaltyPointAddress) {
            const code = await ethers.provider.getCode(loyaltyPointAddress);
            if (code !== "0x") {
                try {
                    const loyaltyBalance = await aimondToken.balanceOf(loyaltyPointAddress);
                    console.log(`LoyaltyPoint contract balance: ${formatUnits(loyaltyBalance, decimals)}`);
                } catch (error: any) {
                    console.log(`❌ Failed to get LoyaltyPoint balance: ${error.message}`);
                }
            }
        }

        // Summary of caller's BaseVestingToken balances
        console.log(`\n--- Caller BaseVestingToken Balances Summary ---`);
        const callerAddress = process.env.INITIAL_OWNER;
        if (callerAddress) {
            console.log(`Caller Address: ${callerAddress}`);
            let totalCallerBalance = 0n;
            let contractsWithCallerBalance = 0;

            for (const contract of contracts) {
                if (contract.address) {
                    const code = await ethers.provider.getCode(contract.address);
                    if (code !== "0x") {
                        try {
                            const contractInstance = await ethers.getContractAt(contract.name, contract.address);
                            const callerBalance = await contractInstance.balanceOf(callerAddress);
                            const contractDecimals = await contractInstance.decimals();
                            
                            console.log(`${contract.name}: ${formatUnits(callerBalance, contractDecimals)}`);
                            totalCallerBalance += callerBalance;
                            if (callerBalance > 0n) {
                                contractsWithCallerBalance++;
                            }
                        } catch (error: any) {
                            console.log(`${contract.name}: ❌ Failed to get balance`);
                        }
                    }
                }
            }

            console.log(`Total caller balance across all vesting tokens: ${formatUnits(totalCallerBalance, 18)}`);
            console.log(`Contracts where caller has tokens: ${contractsWithCallerBalance}/${contracts.length}`);
            
            if (totalCallerBalance === 0n) {
                console.log(`\n💡 ISSUE: Caller has no BaseVestingToken tokens!`);
                console.log(`   This will cause "Simulation failed" errors when calling createVesting`);
                console.log(`   Solutions:`);
                console.log(`   1. Transfer BaseVestingToken tokens to the caller`);
                console.log(`   2. Mint tokens to the caller (if minting is enabled)`);
                console.log(`   3. Use setup-vesting-caller.ts script to fix this`);
                console.log(`   4. Use MOCK_VESTING_SAFE_WALLET for vesting operations instead`);
            } else {
                console.log(`✅ Caller has BaseVestingToken tokens for vesting operations`);
            }
        } else {
            console.log("❌ INITIAL_OWNER not found in .env file");
        }

        // Summary of MOCK_VESTING_SAFE_WALLET BaseVestingToken balances
        console.log(`\n--- Safe Wallet BaseVestingToken Balances Summary ---`);
        const safeWalletAddress = process.env.MOCK_VESTING_SAFE_WALLET;
        if (safeWalletAddress) {
            console.log(`Safe Wallet Address: ${safeWalletAddress}`);
            let totalSafeWalletBalance = 0n;
            let contractsWithSafeWalletBalance = 0;

            for (const contract of contracts) {
                if (contract.address) {
                    const code = await ethers.provider.getCode(contract.address);
                    if (code !== "0x") {
                        try {
                            const contractInstance = await ethers.getContractAt(contract.name, contract.address);
                            const safeWalletBalance = await contractInstance.balanceOf(safeWalletAddress);
                            const contractDecimals = await contractInstance.decimals();
                            
                            console.log(`${contract.name}: ${formatUnits(safeWalletBalance, contractDecimals)}`);
                            totalSafeWalletBalance += safeWalletBalance;
                            if (safeWalletBalance > 0n) {
                                contractsWithSafeWalletBalance++;
                            }
                        } catch (error: any) {
                            console.log(`${contract.name}: ❌ Failed to get balance`);
                        }
                    }
                }
            }

            console.log(`Total safe wallet balance across all vesting tokens: ${formatUnits(totalSafeWalletBalance, 18)}`);
            console.log(`Contracts where safe wallet has tokens: ${contractsWithSafeWalletBalance}/${contracts.length}`);
            
            if (totalSafeWalletBalance === 0n) {
                console.log(`\n💡 INFO: Safe wallet has no BaseVestingToken tokens`);
                console.log(`   This is normal if the safe wallet is only used for Aimond token operations`);
            } else {
                console.log(`✅ Safe wallet has BaseVestingToken tokens`);
            }
        } else {
            console.log("❌ MOCK_VESTING_SAFE_WALLET not found in .env file");
        }
    } catch (error: any) {
        console.log(`❌ Failed to generate balance summary: ${error.message}`);
    }
}


async function main() {
    const envFile = process.env.ENV_FILE || ".env";
    console.log(`Loading environment variables from ${envFile}`);
    dotenv.config({ path: envFile });

    const networkName = network.name;
    console.log(`Getting all info for ${networkName} network`);
    
    await getLoyaltyInfo();
    await getMockInfo();
    await getVestingContractsInfo();

    console.log("\nAll info scripts finished successfully!");
}

main().catch((error) => {
  console.error("An error occurred during info gathering:", error);
  process.exit(1);
});
