// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AimondToken
 * @author AimondLabs
 * @notice This is the main ERC20 token for the Aimond ecosystem.
 * It has a fixed total supply and is owned by an initial owner.
 */
contract AimondToken is ERC20, Ownable {
    /**
     * @dev The total supply of AimondToken (AMD) tokens, fixed at 88 billion.
     */
    uint256 public constant TOTAL_SUPPLY = 88_000_000_000 * (10 ** 18);

    /**
     * @dev Sets up the contract, minting the total supply to the initial owner.
     * @param initialOwner The address that will receive the total supply and own the contract.
     */
    constructor(
        address initialOwner
    ) ERC20("Aimond Token", "AMD") Ownable(initialOwner) {
        _mint(initialOwner, TOTAL_SUPPLY);
    }
}
