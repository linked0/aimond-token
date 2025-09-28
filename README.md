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

## Gnosis Safe Integration

For instructions on administering vesting contracts via Gnosis Safe multisig, see [Gnosis Safe Guide](docs/GNOSIS_SAFE_GUIDE.md).

## References

- [Deploying Smart Contract to BSC Testnet with Hardhat](https://medium.com/@melihgunduz/deploying-smart-contract-to-bsc-testnet-with-hardhat-aa7b046eea1d)
