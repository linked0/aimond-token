// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./BaseVestingToken.sol";

/**
 * @title InvestorVestingToken
 * @author AimondLabs
 * @notice A specific vesting token for investors, inheriting from BaseVestingToken.
 * @dev This contract defines a fixed vesting schedule for investors and allows them to claim their vested tokens.
 */
contract InvestorVestingToken is BaseVestingToken {
    /**
     * @dev The cliff period for investor vesting in seconds.
     */
    uint256 private constant INVESTOR_CLIFF_SECONDS = 360 * 24 * 60 * 60;

    /**
     * @dev The vesting period for investor vesting in seconds.
     */
    uint256 private constant INVESTOR_VESTING_SECONDS =
        INVESTOR_CLIFF_SECONDS + 300 * 24 * 60 * 60;

    /**
     * @dev The number of installments for investor vesting.
     */
    uint256 private constant INVESTOR_INSTALLMENT_COUNT = 10;

    /**
     * @dev The total supply of InvestorVestingToken tokens, fixed at 24 billion.
     */
    uint256 private constant TOTAL_SUPPLY = 24_000_000_000 * 10**18;

    /**
     * @dev Sets up the contract with initial parameters for investor vesting.
     * @param initialOwner The initial owner of the contract.
     * @param initialDistributorManager The initial distributor manager.
     * @param amdTokenAddress The address of the AMD token.
     */
    constructor(
        address initialOwner,
        address initialDistributorManager,
        address amdTokenAddress
    )
        BaseVestingToken(
            "InvestorVestingToken",
            "AIMI",
            initialOwner,
            initialDistributorManager,
            amdTokenAddress,
            TOTAL_SUPPLY
        )
    {}

    /**
     * @notice Creates a vesting schedule for an investor.
     * @dev Can only be called by the owner.
     * @param beneficiary The address of the investor.
     * @param totalAmount The total amount of tokens to be vested.
     */
    function createVesting(
        address beneficiary,
        uint256 totalAmount
    ) public onlyOwner {
        _createVestingSchedule(
            beneficiary,
            INVESTOR_CLIFF_SECONDS,
            INVESTOR_VESTING_SECONDS,
            INVESTOR_INSTALLMENT_COUNT,
            totalAmount
        );
    }

    /**
     * @notice Allows a beneficiary to claim their vested tokens.
     */
    function claim() public nonReentrant {
        _claim();
    }
}
