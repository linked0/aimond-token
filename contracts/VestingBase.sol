// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title VestingBase
 * @author AimondLabs
 * @notice This abstract contract provides a framework for creating ledger tokens that represent a claim on a real ERC20 token (AimondToken),
 * subject to a vesting schedule. It handles the creation of vesting schedules, tracks vested amounts, and allows beneficiaries to release their tokens once vested.
 * It is designed to be inherited by specific token contracts that define their own supply and vesting parameters.
 */
abstract contract VestingBase is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    /**
     * @dev Represents a single vesting schedule for a beneficiary.
     
     * @param cliffDuration The duration in seconds after the global start time before vesting begins.
     * @param vestingDuration The total duration in seconds over which the tokens vest after the cliff.
     * @param installmentCount The number of installments the vesting is divided into.
     * @param releasedAmount The amount of tokens already released to the beneficiary from this schedule.
     */
    struct VestingSchedule {
        uint256 cliffDuration; // In seconds
        uint256 vestingDuration; // In seconds, after the cliff
        uint256 installmentCount;
        uint256 releasedAmount;
    }

    /// @dev The total amount of underlying tokens allocated to this ledger contract.
    uint256 public immutable totalAllocatedTokens;
    /// @dev A mapping from a beneficiary's address to their array of vesting schedules.
    mapping(address => VestingSchedule) public vestingSchedules;
    
    /// @dev The instance of the AIM token contract.
    IERC20 public aimToken;
    /// @dev The instance of the main AimondToken (AMD) contract.
    IERC20 public amdToken;
    /// @dev The cumulative amount of tokens that have been assigned to vesting schedules.
    uint256 public cumulativeVestedAmount;
    /// @dev The official start time for all vesting schedules in this contract, set once by the owner.
    uint256 public globalStartTime;

    /**
     * @dev Emitted when a new vesting schedule is created for a beneficiary.
     * @param beneficiary The address receiving the vested tokens.
     
     * @param cliffDuration The cliff period in seconds.
     * @param vestingDuration The vesting period in seconds.
     * @param installmentCount The number of installments.
     */
    event VestingScheduleCreated(
        address indexed beneficiary,
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
     * @dev Initializes the VestingBase contract.
     * @param initialOwner The address that will have ownership of the contract.
     * @param aimTokenAddress The address of the AIM token contract.
     * @param amdTokenAddress The address of the main AimondToken (AMD) contract.
     */
    constructor(address initialOwner, address aimTokenAddress, address amdTokenAddress) Ownable(initialOwner) {
        require(aimTokenAddress != address(0), "Invalid AIM token address");
        require(amdTokenAddress != address(0), "Invalid AMD token address");
        aimToken = IERC20(aimTokenAddress);
        amdToken = IERC20(amdTokenAddress);
    }

    /**
     * @dev Internal function to create and store a new vesting schedule for a beneficiary.
     * @param beneficiary The address of the beneficiary.
     
     * @param cliffDurationInDays The cliff duration in days.
     * @param vestingDurationInMonths The vesting duration in months.
     * @param installmentCount The number of installments for release.
     */
    function _createVestingSchedule(
        address beneficiary,
        uint256 cliffDurationInDays,
        uint256 vestingDurationInMonths,
        uint256 installmentCount
    ) internal {
        require(aimToken.balanceOf(beneficiary) > 0, "Beneficiary's AIM balance must be greater than 0");
        
        require(
            installmentCount > 0,
            "Installment count must be greater than 0"
        );
        require(
            vestingDurationInMonths >= installmentCount,
            "Vesting duration must accommodate all installments"
        );

        cumulativeVestedAmount += aimToken.balanceOf(beneficiary);

        uint256 cliffDuration = cliffDurationInDays * 86400;
        uint256 vestingDuration = vestingDurationInMonths * 30 days;

        require(vestingSchedules[beneficiary].vestingDuration == 0, "Beneficiary already has a vesting schedule");
        vestingSchedules[beneficiary] = VestingSchedule({
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            installmentCount: installmentCount,
            releasedAmount: 0
        });

        emit VestingScheduleCreated(
            beneficiary,
            cliffDuration,
            vestingDuration,
            installmentCount
        );
    }

    /**
     * @notice Allows a beneficiary to release any vested tokens they are entitled to.
     * The amount of releasable tokens is calculated based on the current time and the beneficiary's vesting schedules.
     * This function transfers the real AimondToken (AMD) to the beneficiary.
     */
    function releaseVestedTokens() public nonReentrant {
        require(globalStartTime > 0, "Global start time not set");
        uint256 totalReleasableAmount = _getCurrentlyReleasableAmount(
            msg.sender
        );

        if (totalReleasableAmount > 0) {
            
            VestingSchedule storage schedule = vestingSchedules[msg.sender];
            uint256 releasable = _calculateReleasableAmount(msg.sender, schedule);
            if (releasable > 0) {
                schedule.releasedAmount += releasable;
            }

            require(aimToken.balanceOf(msg.sender) >= totalReleasableAmount, "Insufficient AIM tokens to claim AMD");
            amdToken.safeTransfer(msg.sender, totalReleasableAmount);
            emit TokensReleased(msg.sender, totalReleasableAmount);
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
        return _calculateReleasableAmount(beneficiary, vestingSchedules[beneficiary]);
    }

    /**
     * @dev Calculates the releasable amount for a single vesting schedule.
     * @param schedule The vesting schedule to calculate.
     * @return The amount of tokens that can be released from this schedule.
     */
    function _calculateReleasableAmount(
        address beneficiary,
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
            return aimToken.balanceOf(beneficiary) - schedule.releasedAmount;
        }

        uint256 vestedInstallments = timeSinceVestingStart /
            installmentDuration;
        if (vestedInstallments > schedule.installmentCount) {
            vestedInstallments = schedule.installmentCount;
        }

        uint256 totalVestedAmount = (aimToken.balanceOf(beneficiary) /
            schedule.installmentCount) * vestedInstallments;

        // Add any remainder from the total amount to the last installment to ensure full distribution
        if (vestedInstallments == schedule.installmentCount) {
            totalVestedAmount +=
                aimToken.balanceOf(beneficiary) %
                schedule.installmentCount;
        }

        return totalVestedAmount - schedule.releasedAmount;
    }
}
