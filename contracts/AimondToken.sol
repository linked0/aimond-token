// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract AimondToken is ERC20 {
    constructor() ERC20("Aimond Token", "AMD") {
        _mint(msg.sender, 88000000000 * (10 ** uint256(decimals())));
    }

    function decimals() public view virtual override returns (uint8) {
        return 8;
    }
}
