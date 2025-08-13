// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseVestingToken.sol";

/**
 * @title InvestorVestingToken
 * @author AimondLabs
 * @notice Vesting token for Investors.
 */
contract InvestorVestingToken is BaseVestingToken {
    uint256 private constant INVESTOR_CLIFF_DAYS = 360;
    uint256 private constant INVESTOR_VESTING_DAYS = 300;
    uint256 private constant INVESTOR_INSTALLMENT_COUNT = 10;

    constructor(address initialOwner, address amdTokenAddress)
        BaseVestingToken("InvestorVestingToken", "AIMI", initialOwner, amdTokenAddress, 24000000000 * (10 ** 18))
    {}

    function createVesting(address beneficiary, uint256 totalAmount) public onlyOwner {
        _createVestingSchedule(
            beneficiary,
            INVESTOR_CLIFF_DAYS,
            INVESTOR_VESTING_DAYS,
            INVESTOR_INSTALLMENT_COUNT,
            totalAmount
        );
    }

    function claim() public {
        _claim();
    }
}