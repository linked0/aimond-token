// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title VestingBase
 * @author AimondLabs
 * @notice This abstract contract provides a framework for creating ledger tokens that represent a claim on a real ERC20 token (AimondToken),
 * subject to a vesting schedule. It handles the creation of vesting schedules, tracks vested amounts, and allows beneficiaries to release their tokens once vested.
 * It is designed to be inherited by specific token contracts that define their own supply and vesting parameters.
 */
abstract contract VestingBase is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20Metadata;
    /**
     * @dev Represents a single vesting schedule for a beneficiary.
     * @param totalAmount The total amount of tokens allocated in this schedule.
     * @param cliffDuration The duration in seconds after the global start time before vesting begins.
     * @param vestingDuration The total duration in seconds over which the tokens vest after the cliff.
     * @param installmentCount The number of installments the vesting is divided into.
     * @param releasedAmount The amount of tokens already released to the beneficiary from this schedule.
     */
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 cliffDuration; // In seconds
        uint256 vestingDuration; // In seconds, after the cliff
        uint256 installmentCount;
        uint256 releasedAmount;
    }

    /// @dev The total amount of underlying tokens allocated to this ledger contract.
    uint256 public immutable totalAllocatedTokens;
    /// @dev A mapping from a beneficiary's address to their array of vesting schedules.
    mapping(address => VestingSchedule[]) public vestingSchedules;
    
    /// @dev The instance of the main AimondToken (AMD) contract.
    IERC20Metadata public amdToken;
    /// @dev The cumulative amount of tokens that have been assigned to vesting schedules.
        uint256 public cumulativeVestedAmount;
    /// @dev The official start time for all vesting schedules in this contract, set once by the owner.
    uint256 public globalStartTime;

    /**
     * @dev Emitted when a new vesting schedule is created for a beneficiary.
     * @param beneficiary The address receiving the vested tokens.
     * @param totalAmount The total amount of tokens in the schedule.
     * @param cliffDuration The cliff period in seconds.
     * @param vestingDuration The vesting period in seconds.
     * @param installmentCount The number of installments.
     */
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 installmentCount
    );

    /**
     * @dev Emitted when a beneficiary releases their vested tokens.
     * @param beneficiary The address that released the tokens.
     * @param amount The amount of AimondToken (AMD) transferred.
     */
    event TokensReleased(address indexed beneficiary, uint256 amount);

    /**
     * @dev Emitted when a beneficiary cancels their own schedules.
     * @param beneficiary The address whose schedules were cancelled.
     * @param totalAmountCancelled The total token amount that was returned to the allocation pool.
     */
    event SchedulesCancelled(
        address indexed beneficiary,
        uint256 totalAmountCancelled
    );

    /**
     * @dev Initializes the VestingBase contract.
     * @param initialOwner The address that will have ownership of the contract.
     * @param amdTokenAddress The address of the main AimondToken (AMD) contract.
     */
    constructor(address initialOwner, address amdTokenAddress) Ownable(initialOwner) {
        require(amdTokenAddress != address(0), "Invalid AMD token address");
        amdToken = IERC20Metadata(amdTokenAddress);
    }

    /**
     * @dev Internal function to create and store a new vesting schedule for a beneficiary.
     * @param beneficiary The address of the beneficiary.
     * @param totalAmount The total amount of tokens to vest.
     * @param cliffDurationInDays The cliff duration in days.
     * @param vestingDurationInMonths The vesting duration in months.
     * @param installmentCount The number of installments for release.
     */
    function _createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 cliffDurationInDays,
        uint256 vestingDurationInMonths,
        uint256 installmentCount
    ) internal {
        require(totalAmount > 0, "Total amount must be greater than 0");
        require(
            installmentCount > 0,
            "Installment count must be greater than 0"
        );
        require(
            vestingDurationInMonths >= installmentCount,
            "Vesting duration must accommodate all installments"
        );

        cumulativeVestedAmount += totalAmount;

        uint256 cliffDuration = cliffDurationInDays * 86400;
        uint256 vestingDuration = vestingDurationInMonths * 30 days;

        vestingSchedules[beneficiary].push(
            VestingSchedule({
                totalAmount: totalAmount * (10 ** amdToken.decimals()),
                cliffDuration: cliffDuration,
                vestingDuration: vestingDuration,
                installmentCount: installmentCount,
                releasedAmount: 0
            })
        );

        emit VestingScheduleCreated(
            beneficiary,
            totalAmount,
            cliffDuration,
            vestingDuration,
            installmentCount
        );
    }

    /**
     * @notice Allows a beneficiary to claim any vested tokens they are entitled to.
     * The amount of releasable tokens is calculated based on the current time and the beneficiary's vesting schedules.
     * This function transfers the real AimondToken (AMD) to the beneficiary.
     */
    function claim() public {
        _releaseVestedTokens(msg.sender);
    }

    /**
     * @notice Allows the owner to release vested tokens on behalf of a beneficiary.
     * This is useful if the beneficiary is unable to call the function themselves.
     * @param beneficiary The address of the beneficiary to release tokens for.
     */
    function releaseTo(
        address beneficiary
    ) public onlyOwner {
        _releaseVestedTokens(beneficiary);
    }

    /**
     * @dev Internal function to perform the actual release of vested tokens for a beneficiary.
     * @param beneficiary The address of the beneficiary.
     */
    function _releaseVestedTokens(address beneficiary) internal nonReentrant {
        require(globalStartTime > 0, "Global start time not set");
        uint256 totalReleasableAmount = _getCurrentlyReleasableAmount(
            beneficiary
        );

        if (totalReleasableAmount > 0) {
            uint256 remainingToRelease = totalReleasableAmount;
            VestingSchedule[] storage schedules = vestingSchedules[beneficiary];
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

            amdToken.safeTransfer(beneficiary, totalReleasableAmount);
            emit TokensReleased(beneficiary, totalReleasableAmount);
        }
    }

    /**
     * @notice Sets the global start time for all vesting schedules. This can only be called once by the owner.
     * The start time is normalized to the beginning of the day (00:00:00 UTC).
     * @param newStartTime The Unix timestamp for the global start time.
     */
    function setGlobalStartTime(uint256 newStartTime) public onlyOwner {
        require(globalStartTime == 0, "Global start time already set");
        require(newStartTime > 0, "New start time must be greater than 0");
        globalStartTime = (newStartTime / 86400) * 86400;
    }

    function getVestingScheduleCount(address beneficiary) public view returns (uint256) {
        return vestingSchedules[beneficiary].length;
    }

    /**
     * @notice Allows a beneficiary to cancel all their vesting schedules.
     * This can ONLY be called before the global start time has been set.
     * This is useful if an incorrect amount was allocated and needs to be reset by the beneficiary.
     */
    function cancelMySchedules() public {
        require(globalStartTime == 0, "Vesting has started, cannot cancel schedules");

        uint256 totalAmountCancelled = 0;
        VestingSchedule[] storage schedules = vestingSchedules[msg.sender];

        // Sum up all amounts and clear the schedules
        for (uint i = 0; i < schedules.length; i++) {
            totalAmountCancelled += schedules[i].totalAmount / (10 ** amdToken.decimals());
        }

        // Clear the array
        delete vestingSchedules[msg.sender];

        // Decrease the cumulative vested amount (unscaled)
        cumulativeVestedAmount -= totalAmountCancelled;

        emit SchedulesCancelled(msg.sender, totalAmountCancelled);
    }

    /**
     * @notice Gets the total amount of tokens that are currently releasable for a given beneficiary.
     * @param beneficiary The address to query.
     * @return The amount of tokens that can be released at the current time.
     */
    function getCurrentlyReleasableAmount(
        address beneficiary
    ) public view returns (uint256) {
        return _getCurrentlyReleasableAmount(beneficiary);
    }

    /**
     * @dev Internal function to calculate the total releasable amount for a beneficiary across all their schedules.
     * @param beneficiary The address to query.
     * @return The total releasable amount.
     */
    function _getCurrentlyReleasableAmount(
        address beneficiary
    ) internal view returns (uint256) {
        uint256 totalReleasableAmount = 0;
        VestingSchedule[] storage schedules = vestingSchedules[beneficiary];

        for (uint i = 0; i < schedules.length; i++) {
            totalReleasableAmount += _calculateReleasableAmount(schedules[i]);
        }
        return totalReleasableAmount;
    }

    /**
     * @dev Calculates the releasable amount for a single vesting schedule.
     * @param schedule The vesting schedule to calculate.
     * @return The amount of tokens that can be released from this schedule.
     */
    function _calculateReleasableAmount(
        VestingSchedule storage schedule
    ) internal view returns (uint256) {
        if (globalStartTime == 0) {
            return 0;
        }
        if (block.timestamp < globalStartTime + schedule.cliffDuration) {
            return 0;
        }

        uint256 timeSinceVestingStart = block.timestamp -
            (globalStartTime + schedule.cliffDuration);
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

        uint256 totalVestedAmount = (schedule.totalAmount /
            schedule.installmentCount) * vestedInstallments;

        // Add any remainder from the total amount to the last installment to ensure full distribution
        if (vestedInstallments == schedule.installmentCount) {
            totalVestedAmount +=
                schedule.totalAmount %
                schedule.installmentCount;
        }

        return totalVestedAmount - schedule.releasedAmount;
    }
}
