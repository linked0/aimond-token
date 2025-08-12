// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MockVestingToken
 * @author AimondLabs
 * @notice A mock vesting contract for testing purposes.
 */
contract MockVestingToken is ERC20, Ownable, ReentrancyGuard, AccessControl {
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
    uint256 public constant MAX_DISTRIBUTORS = 6;
    uint256 public constant MIN_DISTRIBUTORS = 1;
    uint256 public constant MAX_BATCH = 100;

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
        address initialOwner,
        address amdTokenAddress
    ) ERC20("MockVestingToken", "MVST") Ownable(initialOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        currentDistributors = 1;
        _grantRole(DISTRIBUTOR_ROLE, initialOwner);
        require(amdTokenAddress != address(0), "Invalid AMD token address");
        _mint(initialOwner, 1000000000 * (10 ** 18)); // 1 billion tokens
        amdToken = IERC20Metadata(amdTokenAddress);
        require(amdToken.decimals() == decimals(), "Token decimals must match");
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

    function _createVestingSchedule(
        address beneficiary,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 installmentCount,
        uint256 totalAmount
    ) internal {
        require(
            vestingSchedules[beneficiary].totalAmount == 0,
            "Vesting schedule already exists"
        );
        require(installmentCount > 0, "Installment count must be > 0");
        require(totalAmount > 0, "Total amount must be > 0");

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: totalAmount,
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
            totalAmount
        );
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
            "Max distributor limit reached"
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

    function claim() public nonReentrant {
        _releaseVestedTokens(msg.sender);
    }

    function releaseTo(address beneficiary) public nonReentrant onlyOwner {
        _releaseVestedTokens(beneficiary);
    }

    function releaseToBatch(
        address[] calldata beneficiaries
    ) public nonReentrant onlyOwner {
        require(beneficiaries.length <= MAX_BATCH, "Batch size exceeds limit");
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
        globalStartTime = newStartTime;
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

        uint256 vestingPeriodEnd = globalStartTime + schedule.vestingDuration;
        if (block.timestamp >= vestingPeriodEnd) {
            return schedule.totalAmount - schedule.releasedAmount;
        }

        uint256 timeIntoVesting = block.timestamp -
            (globalStartTime + schedule.cliffDuration);
        uint256 mainVestingDuration = schedule.vestingDuration -
            schedule.cliffDuration;

        uint256 vestedAmount = (schedule.totalAmount * timeIntoVesting) /
            mainVestingDuration;

        return vestedAmount - schedule.releasedAmount;
    }
}
