// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./LedgerToken.sol";

/**
 * @title AIMAimond
 * @dev This contract manages the vesting schedule for investors' AIM tokens.
 * It is a LedgerToken, meaning it mints ledger tokens that can be exchanged for the real AimondToken after a vesting period.
 */
contract AIMAimond is LedgerToken {
    /**
     * @dev The total supply of AIMAimond tokens.
     */
    uint256 public constant TOTAL_SUPPLY = 88_000_000_000 * (10 ** 18);
    /**
     * @dev The maximum number of tokens that can be allocated to this vesting group.
     */
    uint256 public constant groupAllocationCap = 24_000_000_000 * (10 ** 18);
    /**
     * @dev The cliff duration in days.
     * Using 363 days ensures the cliff always ends before the exact anniversary,
     * accounting for leap years and varying month lengths to prevent beneficiary frustration.
     */
    uint256 public constant CLIFF_DURATION_DAYS = 363;
    /**
     * @dev The duration of the vesting period in months.
     */
    uint256 public constant VESTING_DURATION_MONTHS = 10;
    /**
     * @dev The number of installments in which the vested tokens are released.
     */
    uint256 public constant INSTALLMENT_COUNT = 10;

    /**
     * @dev Sets up the contract with an initial owner and the address of the main AimondToken.
     * @param initialOwner The address of the initial owner of the contract.
     * @param amdTokenAddress The address of the main AimondToken contract.
     */
    constructor(
        address initialOwner,
        address amdTokenAddress
    ) LedgerToken("AIM Aimond", "AIM", initialOwner, amdTokenAddress) {
        _mint(initialOwner, TOTAL_SUPPLY);
    }

    /**
     * @dev Creates a new vesting schedule for a beneficiary.
     * @param beneficiary The address of the beneficiary of the vesting schedule.
     * @param totalAmount The total amount of tokens to be vested.
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount
    ) public onlyOwner {
        require(
            cumulativeVestedAmount + totalAmount <= TOTAL_SUPPLY,
            "Exceeds total allocation for this vesting contract"
        );
        _createVestingSchedule(
            beneficiary,
            totalAmount,
            CLIFF_DURATION_DAYS,
            VESTING_DURATION_MONTHS,
            INSTALLMENT_COUNT
        );
    }
}
