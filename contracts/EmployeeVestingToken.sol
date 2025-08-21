// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./BaseVestingToken.sol";

/**
 * @title EmployeeVestingToken
 * @author AimondLabs
 * @notice A specific vesting token for employees, inheriting from BaseVestingToken.
 * @dev This contract defines a fixed vesting schedule for employees.
 */
contract EmployeeVestingToken is BaseVestingToken {
    /**
     * @dev The cliff period for employee vesting in days.
     */
    uint256 private constant EMPLOYEE_CLIFF_DAYS = 960;

    /**
     * @dev The vesting period for employee vesting in days.
     */
    uint256 private constant EMPLOYEE_VESTING_DAYS = EMPLOYEE_CLIFF_DAYS;

    /**
     * @dev The number of installments for employee vesting.
     */
    uint256 private constant EMPLOYEE_INSTALLMENT_COUNT = 1;

    /**
     * @dev The total supply of EmployeeVestingToken tokens, fixed at 5.2 billion.
     */
    uint256 private constant TOTAL_SUPPLY = 5_200_000_000 * 10**18;

    /**
     * @dev Sets up the contract with initial parameters for employee vesting.
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
            "EmployeeVestingToken",
            "AIME",
            initialOwner,
            initialDistributorManager,
            amdTokenAddress,
            TOTAL_SUPPLY
        )
    {}

    /**
     * @notice Creates a vesting schedule for an employee.
     * @dev Can only be called by the owner.
     * @param beneficiary The address of the employee.
     * @param totalAmount The total amount of tokens to be vested.
     */
    function createVesting(
        address beneficiary,
        uint256 totalAmount
    ) public onlyOwner {
        _createVestingSchedule(
            beneficiary,
            EMPLOYEE_CLIFF_DAYS,
            EMPLOYEE_VESTING_DAYS,
            EMPLOYEE_INSTALLMENT_COUNT,
            totalAmount
        );
    }
}
