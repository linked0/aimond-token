// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./VestingBase.sol";
import "./interfaces/IInvestorVesting.sol";
import "./interfaces/IFounderVesting.sol";
import "./interfaces/IPartnerVesting.sol";

/**
 * @title TokenVesting
 * @author AimondLabs
 * @notice This contract manages various vesting schedules for different types of participants (e.g., investors, founders, partners).
 * It inherits from VestingBase and allows for the creation of individual vesting schedules.
 */
contract TokenVesting is VestingBase, IInvestorVesting, IFounderVesting, IPartnerVesting {
    // Investor Vesting Constants
    uint256 private constant INVESTOR_CLIFF_DURATION_DAYS = 363;
    uint256 private constant INVESTOR_VESTING_DURATION_MONTHS = 10;
    uint256 private constant INVESTOR_INSTALLMENT_COUNT = 10;

    // Founder Vesting Constants
    uint256 private constant FOUNDER_CLIFF_DURATION_DAYS = 663;
    uint256 private constant FOUNDER_VESTING_DURATION_MONTHS = 10;
    uint256 private constant FOUNDER_INSTALLMENT_COUNT = 10;

    // Partner Vesting Constants
    uint256 private constant PARTNER_CLIFF_DURATION_DAYS = 968;
    uint256 private constant PARTNER_VESTING_DURATION_MONTHS = 1;
    uint256 private constant PARTNER_INSTALLMENT_COUNT = 1;

    /**
     * @dev Sets up the contract with an initial owner and the addresses of the AIM and AMD tokens.
     * @param initialOwner The address of the initial owner of the contract.
     * @param aimTokenAddress The address of the AIM token contract.
     * @param amdTokenAddress The address of the main AimondToken (AMD) contract.
     */
    constructor(
        address initialOwner,
        address aimTokenAddress,
        address amdTokenAddress
    ) VestingBase(initialOwner, aimTokenAddress, amdTokenAddress) {}

    /**
     * @dev Creates a new vesting schedule for an investor.
     * @param beneficiary The address of the beneficiary of the vesting schedule.

     */
    function createInvestorVesting(
        address beneficiary
    ) public onlyOwner override {
        _createVestingSchedule(
            beneficiary,
            INVESTOR_CLIFF_DURATION_DAYS,
            INVESTOR_VESTING_DURATION_MONTHS,
            INVESTOR_INSTALLMENT_COUNT
        );
    }

    /**
     * @dev Creates a new vesting schedule for a founder.
     * @param beneficiary The address of the beneficiary of the vesting schedule.

     */
    function createFounderVesting(
        address beneficiary
    ) public onlyOwner override {
        _createVestingSchedule(
            beneficiary,
            FOUNDER_CLIFF_DURATION_DAYS,
            FOUNDER_VESTING_DURATION_MONTHS,
            FOUNDER_INSTALLMENT_COUNT
        );
    }

    /**
     * @dev Creates a new vesting schedule for a partner.
     * @param beneficiary The address of the beneficiary of the vesting schedule.

     */
    function createPartnerVesting(
        address beneficiary
    ) public onlyOwner override {
        _createVestingSchedule(
            beneficiary,
            PARTNER_CLIFF_DURATION_DAYS,
            PARTNER_VESTING_DURATION_MONTHS,
            PARTNER_INSTALLMENT_COUNT
        );
    }
}
