// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseVestingToken.sol";

/**
 * @title MockVestingToken
 * @author AimondLabs
 * @notice A mock vesting token for testing purposes.
 * @dev This contract inherits from BaseVestingToken and provides a simplified vesting schedule creation for testing.
 */
contract MockVestingToken is BaseVestingToken {
    uint256 public immutable cliffDurationInDays;
    uint256 public immutable vestingDurationInDays;
    uint256 public immutable installmentCount;

    /**
     * @dev Sets up the contract with initial parameters for the mock vesting token.
     * @param initialOwner The initial owner of the contract.
     * @param initialDistributorManager The initial distributor manager.
     * @param amdTokenAddress The address of the AMD token.
     * @param _cliffDurationInDays The cliff duration in days.
     * @param _vestingDurationInDays The total vesting duration in days.
     * @param _installmentCount The number of installments.
     */
    constructor(
        address initialOwner,
        address initialDistributorManager,
        address amdTokenAddress,
        uint256 _cliffDurationInDays,
        uint256 _vestingDurationInDays,
        uint256 _installmentCount
    )
        BaseVestingToken(
            "MockVestingToken",
            "MVST",
            initialOwner,
            initialDistributorManager,
            amdTokenAddress,
            1000000000 * (10 ** 18)
        )
    {
        cliffDurationInDays = _cliffDurationInDays;
        vestingDurationInDays = _vestingDurationInDays;
        installmentCount = _installmentCount;
    }

    /**
     * @notice Creates a vesting schedule for a beneficiary with the mock schedule.
     * @dev Can only be called by an address with the DISTRIBUTOR_ROLE.
     * @param beneficiary The address of the beneficiary.
     * @param totalAmount The total amount of tokens to be vested.
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount
    ) public onlyRole(DISTRIBUTOR_ROLE) {
        

        _createVestingSchedule(
            beneficiary,
            cliffDurationInDays,
            vestingDurationInDays,
            installmentCount,
            totalAmount
        );
    }

    /**
     * @notice Allows a beneficiary to claim their vested tokens.
     */
    function claim() public nonReentrant {
        _releaseVestedTokens(msg.sender);
    }
}