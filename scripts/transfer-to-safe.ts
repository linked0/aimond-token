import { ethers } from "hardhat";
import { formatUnits } from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("=== Transferring Owner Funds to Safe Wallet ===");
    console.log("Deployer:", deployer.address);

    const ownerAddress = process.env.INITIAL_OWNER;
    const safeWalletAddress = process.env.MOCK_VESTING_SAFE_WALLET;
    
    if (!ownerAddress) {
        throw new Error("INITIAL_OWNER not found in .env file");
    }
    
    if (!safeWalletAddress) {
        throw new Error("MOCK_VESTING_SAFE_WALLET not found in .env file");
    }

    console.log("Owner Address:", ownerAddress);
    console.log("Safe Wallet Address:", safeWalletAddress);

    // Define all vesting contracts
    const contracts = [
        { name: "MockVestingToken", address: process.env.MOCK_VESTING_ADDRESS },
        { name: "EmployeeVestingToken", address: process.env.EMPLOYEE_VESTING_ADDRESS },
        { name: "FounderVestingToken", address: process.env.FOUNDER_VESTING_ADDRESS },
        { name: "InvestorVestingToken", address: process.env.INVESTOR_VESTING_ADDRESS }
    ];

    let totalTransferred = 0n;
    let contractsProcessed = 0;
    let contractsSkipped = 0;

    console.log(`\n--- Processing Vesting Contracts ---`);

    for (const contract of contracts) {
        if (!contract.address) {
            console.log(`\nSkipping ${contract.name} - address not found in .env`);
            contractsSkipped++;
            continue;
        }

        // Check if contract exists
        const code = await ethers.provider.getCode(contract.address);
        if (code === "0x") {
            console.log(`\nSkipping ${contract.name} - no contract deployed at ${contract.address}`);
            contractsSkipped++;
            continue;
        }

        try {
            console.log(`\n--- ${contract.name} ---`);
            console.log(`Contract Address: ${contract.address}`);
            
            const contractInstance = await ethers.getContractAt(contract.name, contract.address);
            
            // Get owner's balance
            const ownerBalance = await contractInstance.balanceOf(ownerAddress);
            const decimals = await contractInstance.decimals();
            
            console.log(`Owner Balance: ${formatUnits(ownerBalance, decimals)}`);
            
            if (ownerBalance === 0n) {
                console.log(`✅ Owner has no tokens to transfer`);
                contractsProcessed++;
                continue;
            }

            // Check if owner is the same as deployer (for transaction signing)
            if (ownerAddress.toLowerCase() !== deployer.address.toLowerCase()) {
                console.log(`❌ Owner (${ownerAddress}) is different from deployer (${deployer.address})`);
                console.log(`   Cannot transfer tokens. Owner needs to sign the transaction.`);
                console.log(`   💡 Solutions:`);
                console.log(`   1. Update INITIAL_OWNER in .env to match deployer address`);
                console.log(`   2. Use the owner's private key to sign transactions`);
                contractsSkipped++;
                continue;
            }

            // Transfer tokens from owner to safe wallet
            console.log(`Transferring ${formatUnits(ownerBalance, decimals)} tokens to safe wallet...`);
            
            const tx = await contractInstance.transfer(safeWalletAddress, ownerBalance);
            console.log(`Transaction sent: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`✅ Transfer successful! Gas used: ${receipt.gasUsed.toString()}`);
            
            // Verify the transfer
            const newOwnerBalance = await contractInstance.balanceOf(ownerAddress);
            const newSafeWalletBalance = await contractInstance.balanceOf(safeWalletAddress);
            
            console.log(`Owner Balance After: ${formatUnits(newOwnerBalance, decimals)}`);
            console.log(`Safe Wallet Balance After: ${formatUnits(newSafeWalletBalance, decimals)}`);
            
            totalTransferred += ownerBalance;
            contractsProcessed++;

        } catch (error) {
            console.log(`❌ Failed to process ${contract.name}: ${error.message}`);
            contractsSkipped++;
        }
    }

    // Summary
    console.log(`\n--- Transfer Summary ---`);
    console.log(`Contracts processed: ${contractsProcessed}`);
    console.log(`Contracts skipped: ${contractsSkipped}`);
    console.log(`Total contracts: ${contracts.length}`);
    console.log(`Total tokens transferred: ${formatUnits(totalTransferred, 18)}`);
    
    if (totalTransferred > 0n) {
        console.log(`\n🎉 Successfully transferred all owner funds to safe wallet!`);
        console.log(`💡 Safe wallet now has BaseVestingToken tokens for vesting operations`);
    } else {
        console.log(`\n⚠️  No tokens were transferred`);
        console.log(`💡 This could mean:`);
        console.log(`   - Owner has no tokens in any vesting contracts`);
        console.log(`   - Owner address doesn't match deployer address`);
        console.log(`   - Contracts are not deployed yet`);
    }

    // Show final safe wallet balances
    console.log(`\n--- Final Safe Wallet Balances ---`);
    for (const contract of contracts) {
        if (contract.address) {
            const code = await ethers.provider.getCode(contract.address);
            if (code !== "0x") {
                try {
                    const contractInstance = await ethers.getContractAt(contract.name, contract.address);
                    const safeWalletBalance = await contractInstance.balanceOf(safeWalletAddress);
                    const decimals = await contractInstance.decimals();
                    console.log(`${contract.name}: ${formatUnits(safeWalletBalance, decimals)}`);
                } catch (error) {
                    console.log(`${contract.name}: ❌ Failed to get balance`);
                }
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});