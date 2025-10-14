# Aimond Token Project

An end-to-end solution for the Aimond ecosystem token (AMD), including:

- **ERC20 Token**: `AimondToken` (AMD) — fixed supply token for the Aimond ecosystem.
- **Vesting Contracts**: investor, founder, and employee vesting schedules built on `BaseVestingToken`.
- **Airdrop Mechanism**: on-chain Merkle tree–based distributions via `Airdrop.sol`.
- **Backend Distribution API**: Merkle root management and token allocation backend (see ERD).
- **Gnosis Safe Integration**: secure multisig administration for vesting via Gnosis Safe.

## Table of Contents

- [Aimond Token Project](#aimond-token-project)
  - [Table of Contents](#table-of-contents)
  - [Architecture Overview](#architecture-overview)
  - [Smart Contracts](#smart-contracts)
  - [Database Schema (ERD)](#database-schema-erd)
  - [Documentation](#documentation)
  - [Prerequisites](#prerequisites)
    - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Testing](#testing)
  - [Deployment](#deployment)
  - [Create key store file](#create-key-store-file)
  - [Script Execution Order](#script-execution-order)
    - [1. Initial Setup](#1-initial-setup)
    - [2. Token Distribution](#2-token-distribution)
    - [3. Verification and Monitoring](#3-verification-and-monitoring)
    - [4. Vesting Operations (if necessary)](#4-vesting-operations-if-necessary)
    - [5. Troubleshooting](#5-troubleshooting)
    - [Key Points](#key-points)
  - [Gnosis Safe Integration](#gnosis-safe-integration)
  - [References](#references)

## Architecture Overview

This repository contains:

- Smart contracts for token issuance, vesting schedules, and airdrops.
- A backend schema for generating and tracking Merkle roots and token allocations.
- Helper scripts for deployment and contract interaction via Hardhat.

## Smart Contracts
**Note:** The legacy `contracts/Aimond.sol` file has been removed; its functionality has been consolidated into `AimondToken.sol`.

| Contract                      | Description                                                               |
| ----------------------------- | ------------------------------------------------------------------------- |
| `AimondToken.sol`             | ERC20 token (AMD) with a fixed total supply (88 billion tokens).           |
| `BaseVestingToken.sol`        | Abstract base contract for time-based vesting logic.                      |
| `InvestorVestingToken.sol`    | Vesting logic for investors (10‑month vesting with a 360‑day cliff).       |
| `FounderVestingToken.sol`     | Vesting logic for founders (10‑month vesting with a 660‑day cliff).        |
| `EmployeeVestingToken.sol`    | Vesting logic for employees (one-time cliff of 960 days).                 |


## Database Schema (ERD)

The Merkle root and token allocation database schema is defined in [ERD.md](docs/ERD.md).

## Documentation

- **Token Minting Schedule:** [Aimond AIM Token Minting_250703_V9.pdf](docs/Aimond%20AIM%20Token%20Minting_250703_V9.pdf)
- **Gnosis Safe Integration Guide:** [GNOSIS_SAFE_GUIDE.md](docs/GNOSIS_SAFE_GUIDE.md)

## Prerequisites

- Node.js (>= 20.x)
- Yarn or npm
- Hardhat
- A `.env` file (see below)

### Environment Variables

Create a `.env` file in the project root with the following variables:

```dotenv
BSC_URL=<your BSC mainnet RPC URL>
BSC_TESTNET_URL=<your BSC testnet RPC URL>
ADMIN_KEY=<deployer private key>
USER_KEY=<secondary key for tests/deployments>
ADMIN_ADDRESS=<deployer address>
USER_ADDRESS=<secondary address>
RECIPIENT_ADDRESS=<recipient address for transfers>
AIMOND_ADDRESS=<deployed AimondToken address>
```

## Installation

```bash
yarn install
```

## Testing

Run the full test suite:

```bash
yarn test
```

Or run a specific suite:

```bash
yarn test:inv   # InvestorVesting tests
yarn test:fnd   # FounderVesting tests
yarn test:emp   # EmployeeVesting tests
```

## Deployment

Compile contracts:

```bash
yarn build
```

Start a local Hardhat node:

```bash
yarn localnode
```

Deploy to local network:

```bash
yarn deploy:aim:localnet
```

Deploy to BSC mainnet or testnet:

```bash
yarn deploy:aim:bsc
yarn deploy:aim:bscTestnet
```

Other deployment and transfer scripts for Jaymond token are also available in `package.json`.

## Create key store file
```
ts-node scripts/create-keystore.ts <private-key> <password>
```

## Script Execution Order

To properly set up and manage the vesting system, follow this order when executing scripts:

### 1. Initial Setup
```bash
# Deploy all contracts
yarn deploy:all:bsc
# or
npx hardhat run scripts/deploy-all.ts --network <network>


# Set global start time for all vesting contracts
yarn set:global-start-time:bsc
# or
npx hardhat run scripts/set-global-start-time.ts --network <network>

# Set the owner for vesting contracts
yarn set-owner:bsc
# or
npx hardhat run scripts/set-owner.ts --network <network>
```

### 2. Token Distribution
```bash
# Fund all vesting contracts and loyalty point contract with Aimond tokens
yarn fund:all:bsc
# or
npx hardhat run scripts/fund-all.ts --network <network>

# Transfer BaseVestingToken tokens from initial owner to safe wallet
yarn transfer:safe:bsc
# or
npx hardhat run scripts/transfer-to-safe.ts --network <network>
```

### 3. Verification and Monitoring
```bash
# Check all contract information, balances, and vesting schedules
yarn info:all:bsc
# or
npx hardhat run scripts/get-all-info.ts --network <network>
```

### 4. Vesting Operations (if necessary)
```bash
# Create vesting schedules for beneficiaries
npx hardhat run scripts/set-mock-owner.ts --network <network>  # If using mock owner
npx hardhat run scripts/transfer-tokens.ts --network <network>  # Transfer tokens to beneficiaries
```

### 5. Troubleshooting
If you encounter "Simulation failed" errors when calling `createVesting`:

1. **Check balances**: Run `get-all-info.ts` to see BaseVestingToken balances
2. **Transfer tokens**: Use `transfer-to-safe.ts` to move tokens to the safe wallet
3. **Verify ownership**: Ensure the caller has sufficient BaseVestingToken tokens

### Key Points
- **BaseVestingToken tokens** are needed for `createVesting` operations
- **Aimond tokens** are needed for actual token releases to beneficiaries
- **Safe wallet** should hold BaseVestingToken tokens for vesting operations
- **Owner** should have BaseVestingToken tokens initially (then transfer to safe wallet)

## Gnosis Safe Integration

For instructions on administering vesting contracts via Gnosis Safe multisig, see [Gnosis Safe Guide](docs/GNOSIS_SAFE_GUIDE.md).

## References

- [Deploying Smart Contract to BSC Testnet with Hardhat](https://medium.com/@melihgunduz/deploying-smart-contract-to-bsc-testnet-with-hardhat-aa7b046eea1d)
