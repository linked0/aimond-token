// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BaseVestingToken
 * @author AimondLabs
 * @notice An abstract base contract for vesting tokens. It combines ERC20 functionality
 * with vesting logic for a separate token (AMD).
 */
abstract contract BaseVestingToken is
    ERC20,
    Ownable,
    ReentrancyGuard,
    AccessControl
{
    using SafeERC20 for IERC20Metadata;

    struct VestingSchedule {
        uint256 totalAmount;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 installmentCount;
        uint256 releasedAmount;
    }

    mapping(address => VestingSchedule) public vestingSchedules;

    uint256 public currentDistributors;
    uint256 public constant MAX_DISTRIBUTORS = 6; // Fixed maximum number of distributors
    uint256 public constant MIN_DISTRIBUTORS = 1; // Minimum number of distributors
    uint256 public constant MAX_BATCH = 100; // Maximum beneficiaries per batch release

    event DistributorAdded(address indexed account);
    event DistributorRemoved(address indexed account);

    IERC20Metadata public amdToken;
    uint256 public globalStartTime;

    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 installmentCount,
        uint256 totalAmount
    );

    event TokensReleased(address indexed beneficiary, uint256 amount);

    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    constructor(
        string memory name,
        string memory symbol,
        address initialOwner,
        address amdTokenAddress,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender); // Grants DEFAULT_ADMIN_ROLE to the deployer
        // Initialize currentDistributors
        currentDistributors = 1; // initialOwner gets DISTRIBUTOR_ROLE
        _grantRole(DISTRIBUTOR_ROLE, initialOwner);
        require(amdTokenAddress != address(0), "Invalid AMD token address");
        _mint(initialOwner, initialSupply); // Mints to initialOwner
        amdToken = IERC20Metadata(amdTokenAddress);
        require(amdToken.decimals() == decimals(), "Token decimals must match");
    }

    function _getAdjustedBalance(
        address beneficiary
    ) internal view returns (uint256) {
        return balanceOf(beneficiary);
    }

    function transfer(
        address to,
        uint256 amount
    ) public override onlyRole(DISTRIBUTOR_ROLE) returns (bool) {
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override onlyRole(DISTRIBUTOR_ROLE) returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    function addDistributor(
        address account
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            !hasRole(DISTRIBUTOR_ROLE, account),
            "Account already has DISTRIBUTOR_ROLE"
        );
        require(
            currentDistributors < MAX_DISTRIBUTORS,
            "Max transferer limit reached"
        );
        _grantRole(DISTRIBUTOR_ROLE, account);
        currentDistributors++;
        emit DistributorAdded(account);
    }

    function removeDistributor(
        address account
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            hasRole(DISTRIBUTOR_ROLE, account),
            "Account does not have DISTRIBUTOR_ROLE"
        );
        require(
            currentDistributors - 1 >= MIN_DISTRIBUTORS,
            "Cannot remove: minimum number of DISTRIBUTOR_ROLE holders required"
        );
        _revokeRole(DISTRIBUTOR_ROLE, account);
        currentDistributors--;
        emit DistributorRemoved(account);
    }

    function _createVestingSchedule(
        address beneficiary,
        uint256 cliffDurationInDays,
        uint256 vestingDurationInMonths,
        uint256 installmentCount,
        uint256 _totalAmount
    ) internal {
        require(
            vestingSchedules[beneficiary].totalAmount == 0,
            "Vesting schedule already exists"
        );
        require(
            installmentCount > 0,
            "Installment count must be > 0"
        );
        require(
            _totalAmount == balanceOf(beneficiary),
            "Total amount must match beneficiary's balance"
        );

        uint256 cliffDuration = cliffDurationInDays * 86400;
        uint256 vestingDuration = vestingDurationInMonths * 30 days;

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: _totalAmount,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            installmentCount: installmentCount,
            releasedAmount: 0
        });
        emit VestingScheduleCreated(
            beneficiary,
            cliffDuration,
            vestingDuration,
            installmentCount,
            _totalAmount
        );
    }

    function _claim() internal nonReentrant {
        _releaseVestedTokens(msg.sender);
    }

    function releaseTo(address beneficiary) public nonReentrant onlyOwner {
        _releaseVestedTokens(beneficiary);
    }

    function releaseToBatch(
        address[] calldata beneficiaries
    ) public nonReentrant onlyOwner {
        require(
            beneficiaries.length <= MAX_BATCH,
            "Batch size exceeds limit"
        );
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            _releaseVestedTokens(beneficiaries[i]);
        }
    }

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

    function setGlobalStartTime(uint256 newStartTime) public onlyOwner {
        require(globalStartTime == 0, "Global start time already set");
        globalStartTime = (newStartTime / 86400) * 86400; // Floor to the nearest day
    }

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
        if (installmentDuration == 0) {
            // For one-time cliff vesting
            return schedule.totalAmount - schedule.releasedAmount;
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
            totalVestedAmount = schedule.totalAmount;
        } else {
            totalVestedAmount =
                (schedule.totalAmount * vestedInstallments) /
                schedule.installmentCount;
        }

        return totalVestedAmount - schedule.releasedAmount;
    }
}
