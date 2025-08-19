# Aimond Token


## Integrating AimondVesting with Gnosis Safe

To manage the `AimondVesting` contract's administrative functions (e.g., `createVestingSchedule`) using a Gnosis Safe multisig, follow these steps:

### 1. Deploy Your Gnosis Safe

Ensure you have a Gnosis Safe deployed on the target network. Note down its contract address. This address will be the `owner` of your `AimondVesting` contract.

### 2. Deploy AimondVesting with Gnosis Safe as Owner

When deploying the `AimondVesting` contract, you must set the Gnosis Safe's address as the `owner` in the constructor.

Example (using Hardhat deployment script):

```typescript
// scripts/deploy-aimond-vesting.ts
import { ethers } from "hardhat";

async function main() {
  const AimondTokenAddress = "YOUR_AIMOND_TOKEN_ADDRESS"; // Replace with your deployed AimondToken address
  const GnosisSafeAddress = "YOUR_GNOSIS_SAFE_ADDRESS"; // Replace with your deployed Gnosis Safe address

  const aimondVesting = await ethers.deployContract("AimondVesting", [AimondTokenAddress, GnosisSafeAddress]); // Pass GnosisSafeAddress as owner

  await aimondVesting.waitForDeployment();

  console.log(`AimondVesting deployed to: ${aimondVesting.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**Note:** The `AimondVesting` constructor currently takes `tokenAddress` and `msg.sender` (which is the deployer). You will need to modify the `AimondVesting` constructor to accept an `_owner` address parameter, which you will then pass to the `Ownable` constructor.

### 3. Interact with AimondVesting via Gnosis Safe

Once `AimondVesting` is deployed with the Gnosis Safe as its owner, all functions protected by `onlyOwner` (like `createVestingSchedule`) must be called through the Gnosis Safe interface.

1.  **Go to your Gnosis Safe UI:** Access your Gnosis Safe on the appropriate network.
2.  **Navigate to "New Transaction" -> "Contract Interaction":**
    *   **Recipient:** Enter the deployed `AimondVesting` contract address.
    *   **ABI:** Paste the ABI of the `AimondVesting` contract. You can usually find this in your Hardhat `artifacts` directory (e.g., `artifacts/contracts/AimondVesting.sol/AimondVesting.json`).
    *   **Method:** Select the `createVestingSchedule` method (or any other `onlyOwner` function you wish to call).
    *   **Parameters:** Fill in the required parameters for the selected method.
3.  **Propose and Execute Transaction:** Propose the transaction. Once enough signers confirm, the transaction will be executed by the Gnosis Safe.