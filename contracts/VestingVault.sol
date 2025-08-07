// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title VestingVault
 * @author AimondLabs
 * @notice This contract manages the vesting of Aimond (AIM) tokens for various stakeholders, including investors, founders, and partners.
 * It allows for the creation of different vesting schedules based on the stakeholder's role and facilitates the release of vested tokens over time.
 */
contract VestingVault is Ownable, ReentrancyGuard {
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

    /// @dev Mapping from beneficiary address to their vesting schedule.
    mapping(address => VestingSchedule) public vestingSchedules;

    /// @dev The address of the AIM token contract (used for initial balance check).
    IERC20Metadata public aimToken;
    /// @dev The address of the AMD token contract (the token being vested and released).
    IERC20Metadata public amdToken;
    /// @dev The global start time for all vesting schedules, set once by the owner.
    uint256 public globalStartTime;

    // New cumulative vested amounts for each category
    uint256 public cumulativeInvestorVestedAmount;
    uint256 public cumulativeFounderVestedAmount;
    uint256 public cumulativePartnerVestedAmount;

    // Vesting schedule constants
    /// @dev Cliff duration in days for investor vesting.
        uint256 private constant INVESTOR_CLIFF_DAYS = 360;
    /// @dev Vesting duration in months for investor vesting.
    uint256 private constant INVESTOR_VESTING_MONTHS = 10;
    /// @dev Number of installments for investor vesting.
    uint256 private constant INVESTOR_INSTALLMENT_COUNT = 10;

    /// @dev Cliff duration in days for founder vesting.
        uint256 private constant FOUNDER_CLIFF_DAYS = 660;
    /// @dev Vesting duration in months for founder vesting.
    uint256 private constant FOUNDER_VESTING_MONTHS = 10;
    /// @dev Number of installments for founder vesting.
    uint256 private constant FOUNDER_INSTALLMENT_COUNT = 10;

    /// @dev Cliff duration in days for partner vesting.
    uint256 private constant PARTNER_CLIFF_DAYS = 960;
    /// @dev Vesting duration in months for partner vesting.
    uint256 private constant PARTNER_VESTING_MONTHS = 0;
    /// @dev Number of installments for partner vesting.
    uint256 private constant PARTNER_INSTALLMENT_COUNT = 1;

    /// @dev Total allocation for Investor vesting.
    uint256 private constant INVESTOR_TOTAL_ALLOCATION =
        24000000000 * (10 ** 18);
    /// @dev Total allocation for Founder vesting.
    uint256 private constant FOUNDER_TOTAL_ALLOCATION =
        20000000000 * (10 ** 18);
    /// @dev Total allocation for Partner vesting.
    uint256 private constant PARTNER_TOTAL_ALLOCATION =
        5200000000 * (10 ** 18);

    uint256 private immutable AIM_DECIMALS_MULTIPLIER;

    /// @dev Emitted when a new vesting schedule is created for a beneficiary.
    /// @param beneficiary The address of the beneficiary for whom the schedule was created.
    /// @param cliffDuration The cliff duration in seconds.
    /// @param vestingDuration The total vesting duration in seconds.
    /// @param installmentCount The number of installments.
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 installmentCount
    );
    /// @dev Emitted when vested tokens are successfully released to a beneficiary.
    /// @param beneficiary The address of the beneficiary who received the tokens.
    /// @param amount The amount of tokens released.
    event TokensReleased(address indexed beneficiary, uint256 amount);

    /// @notice Constructs the TokenVesting contract.
    /// @dev Initializes the contract with the initial owner and the addresses of the AIM and AMD token contracts.
    /// @param initialOwner The address that will own the contract.
    /// @param aimTokenAddress The address of the AIM token contract.
    /// @param amdTokenAddress The address of the AMD token contract.
    constructor(
        address initialOwner,
        address aimTokenAddress,
        address amdTokenAddress
    ) Ownable(initialOwner) {
        require(aimTokenAddress != address(0), "Invalid AIM token address");
        require(amdTokenAddress != address(0), "Invalid AMD token address");
        require(
            aimTokenAddress != amdTokenAddress,
            "AIM and AMD tokens cannot be the same"
        );

        aimToken = IERC20Metadata(aimTokenAddress);
        amdToken = IERC20Metadata(amdTokenAddress);
        require(
            amdToken.decimals() >= aimToken.decimals(),
            "AIM decimals must be greater than or equal to AMD decimals"
        );

        AIM_DECIMALS_MULTIPLIER = 10 ** (amdToken.decimals() - aimToken.decimals());
    }

    /// @dev Returns the beneficiary's AIM token balance adjusted by decimals multiplier.
    function _getAdjustedAimBalance(address beneficiary) private view returns (uint256) {
        return aimToken.balanceOf(beneficiary) * AIM_DECIMALS_MULTIPLIER;
    }

    /// @notice Creates a vesting schedule for an investor.
    /// @dev Only the owner can call this function. The schedule uses predefined constants for investors.
    /// @param beneficiary The address of the investor.
    function createInvestorVesting(address beneficiary) public onlyOwner {
        uint256 beneficiaryAllocation = _getAdjustedAimBalance(beneficiary);
        require(
            cumulativeInvestorVestedAmount + beneficiaryAllocation <=
                INVESTOR_TOTAL_ALLOCATION,
            "Investor allocation exceeds total allowed"
        );
        cumulativeInvestorVestedAmount += beneficiaryAllocation;
        _createVestingSchedule(
            beneficiary,
            INVESTOR_CLIFF_DAYS,
            INVESTOR_VESTING_MONTHS,
            INVESTOR_INSTALLMENT_COUNT
        );
    }

    /// @notice Creates a vesting schedule for a founder.
    /// @dev Only the owner can call this function. The schedule uses predefined constants for founders.
    /// @param beneficiary The address of the founder.
    function createFounderVesting(address beneficiary) public onlyOwner {
        uint256 beneficiaryAllocation = _getAdjustedAimBalance(beneficiary);
        require(
            cumulativeFounderVestedAmount + beneficiaryAllocation <=
                FOUNDER_TOTAL_ALLOCATION,
            "Founder allocation exceeds total allowed"
        );
        cumulativeFounderVestedAmount += beneficiaryAllocation;
        _createVestingSchedule(
            beneficiary,
            FOUNDER_CLIFF_DAYS,
            FOUNDER_VESTING_MONTHS,
            FOUNDER_INSTALLMENT_COUNT
        );
    }

    /// @notice Creates a vesting schedule for a partner.
    /// @dev Only the owner can call this function. The schedule uses predefined constants for partners.
    /// @param beneficiary The address of the partner.
    function createPartnerVesting(address beneficiary) public onlyOwner {
        uint256 beneficiaryAllocation = _getAdjustedAimBalance(beneficiary);
        require(
            cumulativePartnerVestedAmount + beneficiaryAllocation <=
                PARTNER_TOTAL_ALLOCATION,
            "Partner allocation exceeds total allowed"
        );
        cumulativePartnerVestedAmount += beneficiaryAllocation;
        _createVestingSchedule(
            beneficiary,
            PARTNER_CLIFF_DAYS,
            PARTNER_VESTING_MONTHS,
            PARTNER_INSTALLMENT_COUNT
        );
    }

    /// @dev Internal function to create a vesting schedule.
    /// @param beneficiary The address of the beneficiary.
    /// @param cliffDurationInDays The cliff duration in days.
    /// @param vestingDurationInMonths The total vesting duration in months.
    /// @param installmentCount The number of installments.
    function _createVestingSchedule(
        address beneficiary,
        uint256 cliffDurationInDays,
        uint256 vestingDurationInMonths,
        uint256 installmentCount
    ) internal {
        require(
            _getAdjustedAimBalance(beneficiary) > 0,
            "Beneficiary has no AIM tokens"
        );
        require(
            vestingSchedules[beneficiary].vestingDuration == 0,
            "Vesting schedule already exists"
        );

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

    /// @notice Allows a beneficiary to claim their currently vested tokens.
    /// @dev This function is reentrancy-guarded.
    function claim() public nonReentrant {
        _releaseVestedTokens(msg.sender);
    }

    /// @notice Allows the owner to release vested tokens to a specific beneficiary.
    /// @dev This function is reentrancy-guarded and can only be called by the owner.
    /// @param beneficiary The address of the beneficiary to release tokens to.
    function releaseTo(address beneficiary) public nonReentrant onlyOwner {
        _releaseVestedTokens(beneficiary);
    }

    /// @dev Internal function to release vested tokens to a beneficiary.
    /// @param beneficiary The address of the beneficiary.
    function _releaseVestedTokens(address beneficiary) internal {
        require(globalStartTime > 0, "Global start time not set");
        uint256 totalReleasableAmount = getCurrentlyReleasableAmount(
            beneficiary
        );

        if (totalReleasableAmount > 0) {
            VestingSchedule storage schedule = vestingSchedules[beneficiary];
            schedule.releasedAmount += totalReleasableAmount;
            SafeERC20.safeTransfer(
                amdToken,
                beneficiary,
                totalReleasableAmount
            );
            emit TokensReleased(beneficiary, totalReleasableAmount);
        }
    }

    /// @notice Sets the global start time for all vesting schedules.
    /// @dev Can only be called once by the owner. The time is floored to the nearest day.
    /// @param newStartTime The Unix timestamp for the global start time.
    function setGlobalStartTime(uint256 newStartTime) public onlyOwner {
        require(globalStartTime == 0, "Global start time already set");
        globalStartTime = (newStartTime / 86400) * 86400;
    }

    /// @notice Calculates the amount of tokens currently releasable for a beneficiary.
    /// @dev This function is view-only and does not alter the contract state.
    /// @param beneficiary The address of the beneficiary.
    /// @return The amount of tokens that can currently be released to the beneficiary.
    function getCurrentlyReleasableAmount(
        address beneficiary
    ) public view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (
            globalStartTime == 0 ||
            block.timestamp < globalStartTime + schedule.cliffDuration
        ) {
            return 0;
        }

        uint256 installmentDuration = schedule.vestingDuration /
            schedule.installmentCount;
        // For zero-duration vesting (e.g. partner one-time cliff), release full balance
        if (installmentDuration == 0) {
            return _getAdjustedAimBalance(beneficiary) - schedule.releasedAmount;
        }

        uint256 timeSinceVestingStart = block.timestamp -
            (globalStartTime + schedule.cliffDuration);
        uint256 vestedInstallments = timeSinceVestingStart /
            installmentDuration +
            1;
        if (vestedInstallments > schedule.installmentCount) {
            vestedInstallments = schedule.installmentCount;
        }

        uint256 totalVestedAmount;
        if (vestedInstallments == schedule.installmentCount) {
            totalVestedAmount = _getAdjustedAimBalance(beneficiary);
        } else {
            totalVestedAmount = (_getAdjustedAimBalance(beneficiary) * vestedInstallments) /
                schedule.installmentCount;
        }

        return totalVestedAmount - schedule.releasedAmount;
    }
}
