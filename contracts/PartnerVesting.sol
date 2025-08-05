// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./VestingBase.sol";

/**
 * @title PartnerVesting
 * @author AimondLabs
 * @dev This contract manages the vesting schedule for partners' AIM tokens.
 * It is a VestingBase, meaning it mints ledger tokens that can be exchanged for the real AimondToken after a vesting period.
 */
contract PartnerVesting is VestingBase {
    
    uint256 public constant groupAllocationCap = 5_200_000_000;
    /**
     * @dev The cliff duration in days (32 months).
     * 365 days + 363 days + 30 days * 8 months = 968 days
     * Using 363 days ensures the cliff always ends before the exact anniversary,
     * accounting for leap years and varying month lengths to prevent beneficiary frustration.
     */
    uint256 public constant CLIFF_DURATION_DAYS = 968;
    /**
     * @dev The duration of the vesting period in months.
     */
    uint256 public constant VESTING_DURATION_MONTHS = 1;
    /**
     * @dev The number of installments in which the vested tokens are released.
     */
    uint256 public constant INSTALLMENT_COUNT = 1;

    /**
     * @dev Sets up the contract with an initial owner and the address of the main AimondToken.
     * @param initialOwner The address of the initial owner of the contract.
     * @param amdTokenAddress The address of the main AimondToken contract.
     */
    constructor(
        address initialOwner,
        address amdTokenAddress
    ) VestingBase(initialOwner, amdTokenAddress) {}

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
            cumulativeVestedAmount + totalAmount <= groupAllocationCap,
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
