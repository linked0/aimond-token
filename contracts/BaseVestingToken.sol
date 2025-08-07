// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title BaseVestingToken
 * @author AimondLabs
 * @notice An abstract base contract for vesting tokens. It combines ERC20 functionality
 * with vesting logic for a separate token (AMD).
 */
abstract contract BaseVestingToken is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20Metadata;

    struct VestingSchedule {
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 installmentCount;
        uint256 releasedAmount;
    }

    mapping(address => VestingSchedule) public vestingSchedules;

    IERC20Metadata public amdToken;
    uint256 public globalStartTime;

    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 installmentCount
    );

    event TokensReleased(address indexed beneficiary, uint256 amount);

    constructor(
        string memory name,
        string memory symbol,
        address initialOwner,
        address amdTokenAddress,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(initialOwner) {
        require(amdTokenAddress != address(0), "Invalid AMD token address");
        _mint(msg.sender, initialSupply);
        amdToken = IERC20Metadata(amdTokenAddress);
        require(amdToken.decimals() == decimals(), "Token decimals must match");
    }

    function _getAdjustedBalance(address beneficiary) internal view returns (uint256) {
        return balanceOf(beneficiary);
    }

    function transfer(address to, uint256 amount) public override onlyOwner returns (bool) {
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override onlyOwner returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    function _createVestingSchedule(
        address beneficiary,
        uint256 cliffDurationInDays,
        uint256 vestingDurationInMonths,
        uint256 installmentCount
    ) internal {
        require(balanceOf(beneficiary) > 0, "Beneficiary has no tokens");
        require(vestingSchedules[beneficiary].vestingDuration == 0, "Vesting schedule already exists");

        uint256 cliffDuration = cliffDurationInDays * 86400;
        uint256 vestingDuration = vestingDurationInMonths * 30 days;

        vestingSchedules[beneficiary] = VestingSchedule(
            cliffDuration,
            vestingDuration,
            installmentCount,
            0
        );
        emit VestingScheduleCreated(
            beneficiary,
            cliffDuration,
            vestingDuration,
            installmentCount
        );
    }

    function _claim() internal nonReentrant {
        _releaseVestedTokens(msg.sender);
    }

    function releaseTo(address beneficiary) public nonReentrant onlyOwner {
        _releaseVestedTokens(beneficiary);
    }

    function _releaseVestedTokens(address beneficiary) internal {
        require(globalStartTime > 0, "Global start time not set");
        uint256 totalReleasableAmount = getCurrentlyReleasableAmount(beneficiary);

        if (totalReleasableAmount > 0) {
            VestingSchedule storage schedule = vestingSchedules[beneficiary];
            schedule.releasedAmount += totalReleasableAmount;
            amdToken.safeTransfer(beneficiary, totalReleasableAmount);
            emit TokensReleased(beneficiary, totalReleasableAmount);
        }
    }

    function setGlobalStartTime(uint256 newStartTime) public onlyOwner {
        require(globalStartTime == 0, "Global start time already set");
        globalStartTime = (newStartTime / 86400) * 86400; // Floor to the nearest day
    }

    function getCurrentlyReleasableAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (globalStartTime == 0 || block.timestamp < globalStartTime + schedule.cliffDuration) {
            return 0;
        }

        uint256 installmentDuration = schedule.vestingDuration / schedule.installmentCount;
        if (installmentDuration == 0) { // For one-time cliff vesting
            return _getAdjustedBalance(beneficiary) - schedule.releasedAmount;
        }

        uint256 timeSinceVestingStart = block.timestamp - (globalStartTime + schedule.cliffDuration);
        uint256 vestedInstallments = timeSinceVestingStart / installmentDuration + 1;
        if (vestedInstallments > schedule.installmentCount) {
            vestedInstallments = schedule.installmentCount;
        }

        uint256 totalVestedAmount;
        if (vestedInstallments == schedule.installmentCount) {
            totalVestedAmount = _getAdjustedBalance(beneficiary);
        } else {
            totalVestedAmount = (_getAdjustedBalance(beneficiary) * vestedInstallments) / schedule.installmentCount;
        }

        return totalVestedAmount - schedule.releasedAmount;
    }
}
