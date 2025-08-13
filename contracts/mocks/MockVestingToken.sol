// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "../BaseVestingToken.sol";

contract MockVestingToken is BaseVestingToken {

    using SafeERC20 for IERC20Metadata;

    

    

    constructor(
        address initialOwner,
        address amdTokenAddress
    ) BaseVestingToken("MockVestingToken", "MVST", initialOwner, amdTokenAddress, 1000000000 * (10 ** 18)) {
    }

    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount
    ) public onlyRole(DISTRIBUTOR_ROLE) {
        require(
            balanceOf(beneficiary) >= totalAmount,
            "Insufficient balance for vesting"
        );

        uint256 cliffDuration = 1 minutes;
        uint256 vestingDuration = 10 minutes;
        uint256 installmentCount = 10;

        _createVestingSchedule(
            beneficiary,
            cliffDuration,
            vestingDuration,
            installmentCount,
            totalAmount
        );
    }

    

    

    

    function claim() public nonReentrant {
        _releaseVestedTokens(msg.sender);
    }
}
