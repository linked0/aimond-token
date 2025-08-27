// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

/**
 * @title BaseVestingToken
 * @author AimondLabs
 * @notice An abstract base contract for vesting tokens. It combines ERC20 functionality
 * with vesting logic for a separate token (AMD).
 * @dev This contract manages the vesting schedules and release of a specified ERC20 token (amdToken).
 * It uses AccessControl for managing distributor roles.
 */
abstract contract BaseVestingToken is
    ERC20,
    Ownable,
    ReentrancyGuard,
    AccessControlEnumerable
{
    using SafeERC20 for IERC20Metadata;

    /**
     * @dev Represents a vesting schedule for a beneficiary.
     * @param totalAmount The total amount of tokens to be vested.
     * @param totalVestingDuration The total duration of the vesting period in seconds, after the cliff.
     * @param cliffDuration The duration in seconds before vesting starts.
     * @param releaseDuration The duration in second after cliff ends.
     * @param installmentCount The number of installments in which the tokens are released.
     * @param releasedAmount The amount of tokens already released.
     */
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 totalVestingDuration;
        uint256 cliffDuration;
        uint256 releaseDuration;
        uint256 installmentCount;
        uint256 releasedAmount;
    }

    /**
     * @dev Mapping from a beneficiary address to their vesting schedule.
     */
    mapping(address => VestingSchedule) public vestingSchedules;

    /**
     * @dev Emitted when a new distributor is added.
     * @param account The address of the new distributor.
     */
    event DistributorAdded(address indexed account);

    /**
     * @dev Emitted when a distributor is removed.
     * @param account The address of the removed distributor.
     */
    event DistributorRemoved(address indexed account);

    /**
     * @dev The ERC20 token that will be vested and released.
     */
    IERC20Metadata public amdToken;

    /**
     * @dev The global start time for all vesting schedules, as a Unix timestamp.
     */
    uint256 public globalStartTime;

    /**
     * @dev Emitted when a new vesting schedule is created.
     * @param beneficiary The address of the beneficiary.
     * @param totalVestingDuration The total duration of the vesting period in seconds, after the cliff.
     * @param cliffDuration The duration in seconds before vesting starts.
     * @param releaseDuration The duration in second after cliff ends.
     * @param installmentCount The number of installments in which the tokens are released.
     * @param totalAmount The total amount of tokens to be vested.
     */
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 totalVestingDuration,
        uint256 cliffDuration,
        uint256 releaseDuration,
        uint256 installmentCount,
        uint256 totalAmount
    );

    /**
     * @dev Emitted when tokens are released to a beneficiary.
     * @param beneficiary The address of the beneficiary.
     * @param amount The amount of tokens released.
     */
    event TokensReleased(address indexed beneficiary, uint256 amount);

    /**
     * @dev Emitted when the global start time is set.
     * @param startTime The new global start time.
     */
    event GlobalStartTimeSet(uint256 startTime);

    /**
     * @dev The maximum number of beneficiaries that can be released in a single batch transaction.
     */
    uint256 public constant MAX_BATCH = 100;

    /**
     * @dev Role for addresses that can distribute tokens.
     */
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    /**
     * @dev Role for addresses that can manage distributors.
     */
    bytes32 public constant DISTRIBUTOR_MANAGER_ROLE =
        keccak256("DISTRIBUTOR_MANAGER_ROLE");

    /**
     * @dev Sets up the contract with initial parameters.
     * @param name The name of the vesting token.
     * @param symbol The symbol of the vesting token.
     * @param initialOwner The initial owner of the contract.
     * @param initialDistributorManager The initial distributor manager.
     * @param amdTokenAddress The address of the AMD token.
     * @param initialSupply The initial supply of the vesting token.
     */
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner,
        address initialDistributorManager,
        address amdTokenAddress,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(DISTRIBUTOR_ROLE, initialOwner);
        _grantRole(DISTRIBUTOR_ROLE, initialDistributorManager);
        _grantRole(DISTRIBUTOR_MANAGER_ROLE, initialDistributorManager);
        _grantRole(DISTRIBUTOR_MANAGER_ROLE, initialOwner);

        require(amdTokenAddress != address(0), "Invalid AMD token address");
        _mint(initialOwner, initialSupply);
        amdToken = IERC20Metadata(amdTokenAddress);
        require(amdToken.decimals() == decimals(), "Token decimals must match");
    }

    /**
     * @dev Overrides the default transfer function to restrict it to distributors.
     * @param to The address to transfer to.
     * @param amount The amount to transfer.
     * @return A boolean indicating whether the operation succeeded.
     */
    function transfer(
        address to,
        uint256 amount
    ) public virtual override onlyRole(DISTRIBUTOR_ROLE) returns (bool) {
        return super.transfer(to, amount);
    }

    /**
     * @dev Overrides the default transferFrom function to restrict it to distributors.
     * @param from The address to transfer from.
     * @param to The address to transfer to.
     * @param amount The amount to transfer.
     * @return A boolean indicating whether the operation succeeded.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override onlyRole(DISTRIBUTOR_ROLE) returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    /**
     * @dev Adds a new distributor manager.
     * @param account The address of the new distributor manager.
     */
    function addDistributorManager(
        address account
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DISTRIBUTOR_MANAGER_ROLE, account);
    }

    /**
     * @dev Removes a distributor manager.
     * @param account The address of the distributor manager to remove.
     */
    function removeDistributorManager(
        address account
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(DISTRIBUTOR_MANAGER_ROLE, account);
    }

    /**
     * @dev Adds a new distributor.
     * @param account The address of the new distributor.
     */
    function addDistributor(
        address account
    ) public onlyRole(DISTRIBUTOR_MANAGER_ROLE) {
        require(
            !hasRole(DISTRIBUTOR_ROLE, account),
            "Account already has DISTRIBUTOR_ROLE"
        );

        _grantRole(DISTRIBUTOR_ROLE, account);
        emit DistributorAdded(account);
    }

    /**
     * @dev Removes a distributor.
     * @param account The address of the distributor to remove.
     */
    function removeDistributor(
        address account
    ) public onlyRole(DISTRIBUTOR_MANAGER_ROLE) {
        require(
            hasRole(DISTRIBUTOR_ROLE, account),
            "Account does not have DISTRIBUTOR_ROLE"
        );

        _revokeRole(DISTRIBUTOR_ROLE, account);
        emit DistributorRemoved(account);
    }

    /**
     * @dev Internal function to create a vesting schedule for a beneficiary.
     * @param beneficiary The address of the beneficiary.
     * @param cliffDurationInDays The cliff duration in days.
     * @param vestingDurationInDays The vesting duration in days.
     * @param installmentCount The number of installments.
     * @param _totalAmount The total amount of tokens to be vested.
     */
    function _createVestingSchedule(
        address beneficiary,
        uint256 cliffDurationInDays,
        uint256 vestingDurationInDays,
        uint256 installmentCount,
        uint256 _totalAmount
    ) internal {
        require(
            vestingSchedules[beneficiary].totalAmount == 0,
            "Vesting schedule already exists"
        );
        require(_totalAmount > 0, "Total amount must be greater than 0");
        require(installmentCount > 0, "Installment count must be > 0");
        require(
            vestingDurationInDays >= cliffDurationInDays,
            "Vesting duration must be greater than or equal to cliff duration"
        );
        // Transfer amdToken from the owner (msg.sender) to this contract.
        amdToken.safeTransferFrom(msg.sender, address(this), _totalAmount);

        uint256 cliffDuration = cliffDurationInDays * 86400;
        uint256 totalVestingDuration = vestingDurationInDays * 86400;
        uint256 releaseDuration = totalVestingDuration - cliffDuration;

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: _totalAmount,
            totalVestingDuration: totalVestingDuration,
            cliffDuration: cliffDuration,
            releaseDuration: releaseDuration,
            installmentCount: installmentCount,
            releasedAmount: 0
        });
        emit VestingScheduleCreated(
            beneficiary,
            totalVestingDuration,
            cliffDuration,
            releaseDuration,
            installmentCount,
            _totalAmount
        );
    }

    /**
     * @dev Internal function for a beneficiary to claim their vested tokens.
     */
    function _claim() internal {
        _releaseVestedTokens(msg.sender);
    }

    /**
     * @dev Releases vested tokens to a specific beneficiary. Can only be called by the owner.
     * @param beneficiary The address of the beneficiary.
     */
    function releaseTo(address beneficiary) public nonReentrant onlyOwner {
        _releaseVestedTokens(beneficiary);
    }

    /**
     * @dev Releases vested tokens to a batch of beneficiaries. Can only be called by the owner.
     * @param beneficiaries An array of beneficiary addresses.
     */
    function releaseToBatch(
        address[] calldata beneficiaries
    ) public nonReentrant onlyOwner {
        require(beneficiaries.length <= MAX_BATCH, "Batch size exceeds limit");
        require(globalStartTime > 0, "Global start time not set");
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            _releaseVestedTokens(beneficiaries[i]);
        }
    }

    /**
     * @dev Internal function to release vested tokens to a beneficiary.
     * @param beneficiary The address of the beneficiary.
     */
    function _releaseVestedTokens(address beneficiary) internal {
        require(globalStartTime > 0, "Global start time not set");
        uint256 totalReleasableAmount = getCurrentlyReleasableAmount(
            beneficiary
        );

        if (totalReleasableAmount > 0) {
            VestingSchedule storage schedule = vestingSchedules[beneficiary];
            schedule.releasedAmount += totalReleasableAmount;
            amdToken.safeTransfer(beneficiary, totalReleasableAmount);
            emit TokensReleased(beneficiary, totalReleasableAmount);
        }
    }

    /**
     * @dev Sets the global start time for all vesting schedules. Can only be called once.
     * @param newStartTime The new global start time as a Unix timestamp.
     */
    function setGlobalStartTime(uint256 newStartTime) public onlyOwner {
        require(globalStartTime == 0, "Global start time already set");
        require(newStartTime > 0, "Invalid start time");
        globalStartTime = (newStartTime / 86400) * 86400; // Floor to the nearest day
        emit GlobalStartTimeSet(globalStartTime);
    }

    /**
     * @dev Calculates the amount of tokens that are currently releasable for a beneficiary.
     * @param beneficiary The address of the beneficiary.
     * @return The amount of releasable tokens.
     */
    function getCurrentlyReleasableAmount(
        address beneficiary
    ) public view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (
            globalStartTime == 0 ||
            schedule.totalAmount == 0 ||
            schedule.totalAmount == schedule.releasedAmount
        ) {
            return 0;
        }

        // If current time is before the cliff ends, no tokens are vested
        if (block.timestamp < globalStartTime + schedule.cliffDuration) {
            return 0;
        }

        // Explicitly handle single-installment schedules (one-time release after cliff)
        if (schedule.installmentCount == 1) {
            return schedule.totalAmount - schedule.releasedAmount;
        }

        uint256 installmentDuration = schedule.releaseDuration /
            schedule.installmentCount;

        uint256 timeSinceCliffEnd = block.timestamp -
            (globalStartTime + schedule.cliffDuration);
        uint256 vestedInstallments = timeSinceCliffEnd /
            installmentDuration +
            1;

        // Cap vested installments at the total count to prevent overshooting due to
        // calculation precision or edge cases.
        if (vestedInstallments > schedule.installmentCount) {
            vestedInstallments = schedule.installmentCount;
        }

        uint256 totalVestedAmount;
        if (vestedInstallments == schedule.installmentCount) {
            totalVestedAmount = schedule.totalAmount;
        } else {
            uint256 vestedProportionNumerator = schedule.totalAmount *
                vestedInstallments;
            totalVestedAmount =
                vestedProportionNumerator /
                schedule.installmentCount;
        }

        return totalVestedAmount - schedule.releasedAmount;
    }
}
