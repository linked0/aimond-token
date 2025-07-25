// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenVesting is Ownable, ReentrancyGuard {
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffDuration; // In seconds
        uint256 vestingDuration; // In seconds, after the cliff
        uint256 installmentCount;
        uint256 releasedAmount;
    }

    mapping(address => VestingSchedule[]) public vestingSchedules;
    IERC20 public aimondToken;

    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 installmentCount
    );
    event TokensReleased(address indexed beneficiary, uint256 amount);

    constructor(
        address tokenAddress,
        address initialOwner
    ) Ownable(initialOwner) {
        aimondToken = IERC20(tokenAddress);
    }

    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDurationInDays,
        uint256 vestingDurationInMonths,
        uint256 installmentCount
    ) public onlyOwner {
        require(totalAmount > 0, "Total amount must be greater than 0");
        require(
            installmentCount > 0,
            "Installment count must be greater than 0"
        );
        require(
            vestingDurationInMonths >= installmentCount,
            "Vesting duration must accommodate all installments"
        );

        uint256 cliffDuration = cliffDurationInDays * 86400; // Convert days to seconds
        uint256 vestingDuration = vestingDurationInMonths * 30 days; // Approximate months to seconds

        vestingSchedules[beneficiary].push(
            VestingSchedule({
                totalAmount: totalAmount,
                startTime: startTime,
                cliffDuration: cliffDuration,
                vestingDuration: vestingDuration,
                installmentCount: installmentCount,
                releasedAmount: 0
            })
        );

        emit VestingScheduleCreated(
            beneficiary,
            totalAmount,
            startTime,
            cliffDuration,
            vestingDuration,
            installmentCount
        );
    }

    function releaseVestedTokens() public nonReentrant {
        uint256 totalReleasableAmount = 0;
        VestingSchedule[] storage schedules = vestingSchedules[msg.sender];

        for (uint i = 0; i < schedules.length; i++) {
            totalReleasableAmount += _calculateReleasableAmount(schedules[i]);
        }

        if (totalReleasableAmount > 0) {
            // Update the released amount in each schedule
            uint256 remainingToRelease = totalReleasableAmount;
            for (uint i = 0; i < schedules.length; i++) {
                uint256 releasable = _calculateReleasableAmount(schedules[i]);
                if (releasable > 0) {
                    uint256 amountToMark = (remainingToRelease < releasable)
                        ? remainingToRelease
                        : releasable;
                    schedules[i].releasedAmount += amountToMark;
                    remainingToRelease -= amountToMark;
                }
            }

            aimondToken.transfer(msg.sender, totalReleasableAmount);
            emit TokensReleased(msg.sender, totalReleasableAmount);
        }
    }

    function _calculateReleasableAmount(
        VestingSchedule storage schedule
    ) internal view returns (uint256) {
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0; // Before cliff ends
        }

        uint256 timeSinceVestingStart = block.timestamp -
            (schedule.startTime + schedule.cliffDuration);
        uint256 installmentDuration = schedule.vestingDuration /
            schedule.installmentCount;

        if (installmentDuration == 0) {
            return schedule.totalAmount - schedule.releasedAmount;
        }

        uint256 vestedInstallments = timeSinceVestingStart /
            installmentDuration;
        if (vestedInstallments > schedule.installmentCount) {
            vestedInstallments = schedule.installmentCount;
        }

        uint256 amountPerInstallment = schedule.totalAmount /
            schedule.installmentCount;
        uint256 totalVestedAmount = vestedInstallments * amountPerInstallment;

        return totalVestedAmount - schedule.releasedAmount;
    }

    function getVestingSchedules(
        address beneficiary
    ) public view returns (VestingSchedule[] memory) {
        return vestingSchedules[beneficiary];
    }

    function getCurrentlyReleasableAmount(
        address beneficiary
    ) public view returns (uint256) {
        uint256 totalReleasableAmount = 0;
        VestingSchedule[] memory schedules = vestingSchedules[beneficiary];

        for (uint i = 0; i < schedules.length; i++) {
            // Since _calculateReleasableAmount is internal, we replicate its logic here for a view function.
            VestingSchedule memory schedule = schedules[i];
            if (
                block.timestamp >= schedule.startTime + schedule.cliffDuration
            ) {
                uint256 timeSinceVestingStart = block.timestamp -
                    (schedule.startTime + schedule.cliffDuration);
                uint256 installmentDuration = schedule.vestingDuration /
                    schedule.installmentCount;

                uint256 vestedInstallments;
                if (installmentDuration == 0) {
                    vestedInstallments = schedule.installmentCount;
                } else {
                    vestedInstallments =
                        timeSinceVestingStart /
                        installmentDuration;
                }

                if (vestedInstallments > schedule.installmentCount) {
                    vestedInstallments = schedule.installmentCount;
                }

                uint256 amountPerInstallment = schedule.totalAmount /
                    schedule.installmentCount;
                uint256 totalVestedAmount = vestedInstallments *
                    amountPerInstallment;

                totalReleasableAmount += (totalVestedAmount -
                    schedule.releasedAmount);
            }
        }
        return totalReleasableAmount;
    }

    function getTotalVestedAmount(
        address beneficiary
    ) public view returns (uint256) {
        uint256 totalAmount = 0;
        VestingSchedule[] memory schedules = vestingSchedules[beneficiary];

        for (uint i = 0; i < schedules.length; i++) {
            totalAmount += schedules[i].totalAmount;
        }

        return totalAmount;
    }
}
