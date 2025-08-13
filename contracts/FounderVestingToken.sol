// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseVestingToken.sol";

/**
 * @title FounderVestingToken
 * @author AimondLabs
 * @notice Vesting token for Founders.
 */
contract FounderVestingToken is BaseVestingToken {
    uint256 private constant FOUNDER_CLIFF_DAYS = 660;
    uint256 private constant FOUNDER_VESTING_DAYS = 300;
    uint256 private constant FOUNDER_INSTALLMENT_COUNT = 10;

    constructor(address initialOwner, address amdTokenAddress)
        BaseVestingToken("FounderVestingToken", "AIMF", initialOwner, amdTokenAddress, 20000000000 * (10 ** 18))
    {}

    function createVesting(address beneficiary, uint256 totalAmount) public onlyOwner {
        _createVestingSchedule(
            beneficiary,
            FOUNDER_CLIFF_DAYS,
            FOUNDER_VESTING_DAYS,
            FOUNDER_INSTALLMENT_COUNT,
            totalAmount
        );
    }
}
