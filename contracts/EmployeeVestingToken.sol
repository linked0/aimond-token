// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseVestingToken.sol";

/**
 * @title EmployeeVestingToken
 * @author AimondLabs
 * @notice Vesting token for Employees.
 */
contract EmployeeVestingToken is BaseVestingToken {
    uint256 private constant EMPLOYEE_CLIFF_DAYS = 960;
    uint256 private constant EMPLOYEE_VESTING_MONTHS = 0;
    uint256 private constant EMPLOYEE_INSTALLMENT_COUNT = 1;

    constructor(address initialOwner, address amdTokenAddress)
        BaseVestingToken("EmployeeVestingToken", "AIME", initialOwner, amdTokenAddress, 5200000000 * (10 ** 18))
    {}

    function createVesting(address beneficiary, uint256 totalAmount) public onlyOwner {
        _createVestingSchedule(
            beneficiary,
            EMPLOYEE_CLIFF_DAYS,
            EMPLOYEE_VESTING_MONTHS,
            EMPLOYEE_INSTALLMENT_COUNT,
            totalAmount
        );
    }
}
