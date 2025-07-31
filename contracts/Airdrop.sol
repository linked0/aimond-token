// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // For access control
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Airdrop
 * @author AimondLabs
 * @notice This contract manages the airdrop of AimondToken (AMD) to specified recipients.
 * It has a total allocation and ensures that the airdropped amount does not exceed this limit.
 * The owner of the contract is responsible for initiating the airdrop.
 */
contract Airdrop is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    /**
     * @dev The instance of the main AimondToken (AMD) contract.
     */
    IERC20 public immutable aimondToken;
    /**
     * @dev The total number of tokens allocated for the airdrop.
     */
    uint256 public immutable totalAirdropAllocation;
    /**
     * @dev The total number of tokens that have been distributed so far.
     */
    uint256 public distributedAmount;

    /**
     * @dev Emitted when tokens are airdropped to a recipient.
     * @param recipient The address of the recipient.
     * @param amount The amount of tokens airdropped.
     */
    event TokensAirdropped(address indexed recipient, uint256 amount);

    /**
     * @dev Sets up the contract with the AimondToken address, initial owner, and total airdrop allocation.
     * @param _aimondTokenAddress The address of the main AimondToken (AMD) contract.
     * @param initialOwner The address of the initial owner of the contract.
     * @param _totalAirdropAllocation The total number of tokens allocated for the airdrop.
     */
    constructor(
        address _aimondTokenAddress,
        address initialOwner,
        uint256 _totalAirdropAllocation
    ) Ownable(initialOwner) {
        require(_aimondTokenAddress != address(0), "Invalid token address");
        aimondToken = IERC20(_aimondTokenAddress);
        totalAirdropAllocation = _totalAirdropAllocation;
    }

    /**
     * @notice Airdrops a specified amount of AimondToken (AMD) to a recipient.
     * Can only be called by the owner.
     * @param _recipient The address of the recipient.
     * @param _amount The amount of tokens to airdrop.
     */
    function airdropTokens(
        address _recipient,
        uint256 _amount
    ) public onlyOwner nonReentrant {
        require(_recipient != address(0), "Recipient cannot be zero address");
        require(_amount > 0, "Amount must be greater than 0");
        require(
            distributedAmount + _amount <= totalAirdropAllocation,
            "Exceeds total airdrop allocation"
        );

        // Ensure this contract holds enough tokens
        require(
            aimondToken.balanceOf(address(this)) >= _amount,
            "Insufficient tokens in contract"
        );

        distributedAmount += _amount;
        aimondToken.safeTransfer(_recipient, _amount);

        emit TokensAirdropped(_recipient, _amount);
    }

    /**
     * @notice Allows the owner to recover any ERC20 tokens accidentally sent to this contract.
     * This function cannot be used to recover the main AimondToken (AMD).
     * @param _tokenAddress The address of the ERC20 token to recover.
     * @param _amount The amount of tokens to recover.
     */
    function recoverERC20(
        address _tokenAddress,
        uint256 _amount
    ) public onlyOwner {
        require(
            _tokenAddress != address(aimondToken),
            "Cannot recover main token via this function"
        );
        IERC20 token = IERC20(_tokenAddress);
        token.safeTransfer(owner(), _amount);
    }
}
