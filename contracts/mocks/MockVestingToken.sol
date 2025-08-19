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
    /**
     * @dev Sets up the contract with initial parameters for the mock vesting token.
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
            "MockVestingToken",
            "MVST",
            initialOwner,
            initialDistributorManager,
            amdTokenAddress,
            1000000000 * (10 ** 18)
        )
    {}

    /**
     * @notice Creates a vesting schedule for a beneficiary with a mock schedule.
     * @dev Can only be called by an address with the DISTRIBUTOR_ROLE.
     * @param beneficiary The address of the beneficiary.
     * @param totalAmount The total amount of tokens to be vested.
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount
    ) public onlyRole(DISTRIBUTOR_ROLE) {
        require(
            balanceOf(beneficiary) >= totalAmount,
            "Insufficient balance for vesting"
        );

        uint256 cliffDuration = 1 minutes;
        uint256 vestingDuration = 11 minutes;
        uint256 installmentCount = 10;

        _createVestingSchedule(
            beneficiary,
            cliffDuration,
            vestingDuration,
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
