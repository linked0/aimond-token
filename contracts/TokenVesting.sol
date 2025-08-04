// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TokenVesting
 * @author AimondLabs
 * @notice This contract manages the vesting of Aimond (AIM) tokens for various stakeholders, including investors, founders, and partners.
 * It allows for the creation of different vesting schedules based on the stakeholder's role and facilitates the release of vested tokens over time.
 */
contract TokenVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /**
     * @dev Represents a single vesting schedule for a beneficiary.
     * @param cliffDuration The duration in seconds after the global start time before vesting begins.
     * @param vestingDuration The total duration in seconds over which the tokens vest after the cliff.
     * @param installmentCount The number of installments the vesting is divided into.
     * @param releasedAmount The amount of tokens already released to the beneficiary from this schedule.
     */
    struct VestingSchedule {
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 installmentCount;
        uint256 releasedAmount;
    }

    mapping(address => VestingSchedule) public vestingSchedules;

    IERC20 public aimToken;
    IERC20 public amdToken;
    uint256 public cumulativeVestedAmount;
    uint256 public globalStartTime;

    event VestingScheduleCreated(address indexed beneficiary, uint256 cliffDuration, uint256 vestingDuration, uint256 installmentCount);
    event TokensReleased(address indexed beneficiary, uint256 amount);

    constructor(address initialOwner, address aimTokenAddress, address amdTokenAddress) Ownable(initialOwner) {
        require(aimTokenAddress != address(0), "Invalid AIM token address");
        require(amdTokenAddress != address(0), "Invalid AMD token address");
        aimToken = IERC20(aimTokenAddress);
        amdToken = IERC20(amdTokenAddress);
    }

    function createInvestorVesting(address beneficiary) public onlyOwner {
        _createVestingSchedule(beneficiary, 364, 36, 36);
    }

    function createFounderVesting(address beneficiary) public onlyOwner {
        _createVestingSchedule(beneficiary, 665, 30, 30);
    }

    function createPartnerVesting(address beneficiary) public onlyOwner {
        _createVestingSchedule(beneficiary, 970, 1, 1);
    }

    function _createVestingSchedule(address beneficiary, uint256 cliffDurationInDays, uint256 vestingDurationInMonths, uint256 installmentCount) internal {
        require(aimToken.balanceOf(beneficiary) > 0, "Beneficiary has no AIM tokens");
        require(vestingSchedules[beneficiary].vestingDuration == 0, "Vesting schedule already exists");
        cumulativeVestedAmount += aimToken.balanceOf(beneficiary);

        uint256 cliffDuration = cliffDurationInDays * 86400;
        uint256 vestingDuration = vestingDurationInMonths * 30 days;

        vestingSchedules[beneficiary] = VestingSchedule(cliffDuration, vestingDuration, installmentCount, 0);
        emit VestingScheduleCreated(beneficiary, cliffDuration, vestingDuration, installmentCount);
    }

    function claim() public nonReentrant {
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
        globalStartTime = (newStartTime / 86400) * 86400;
    }

    function getCurrentlyReleasableAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (globalStartTime == 0 || block.timestamp < globalStartTime + schedule.cliffDuration) {
            return 0;
        }

        uint256 timeSinceVestingStart = block.timestamp - (globalStartTime + schedule.cliffDuration);
        uint256 installmentDuration = schedule.vestingDuration / schedule.installmentCount;

        if (installmentDuration == 0) {
            return aimToken.balanceOf(beneficiary) - schedule.releasedAmount;
        }

        uint256 vestedInstallments = timeSinceVestingStart / installmentDuration;
        if (vestedInstallments > schedule.installmentCount) {
            vestedInstallments = schedule.installmentCount;
        }

        uint256 totalVestedAmount = (aimToken.balanceOf(beneficiary) * vestedInstallments) / schedule.installmentCount;

        // Add any remainder from the total amount to the last installment to ensure full distribution
        if (vestedInstallments == schedule.installmentCount) {
            totalVestedAmount += aimToken.balanceOf(beneficiary) % schedule.installmentCount;
        }

        return totalVestedAmount - schedule.releasedAmount;
    }
}
