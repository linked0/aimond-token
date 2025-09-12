// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract LoyaltyPoint is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IERC20 public immutable amdToken;
    bytes32 public merkleRoot;

    mapping(address => uint256) public claimed; // total already given (on-chain truth)

    event RootUpdated(bytes32 newRoot);
    event Claimed(address indexed user, uint256 amount);

    constructor(IERC20 _token, bytes32 _root) {
        amdToken = _token;
        merkleRoot = _root;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender); // msg.sender is the owner (multisig)
        _grantRole(ADMIN_ROLE, msg.sender); // Grant admin role to the owner as well
    }

    function updateRoot(bytes32 _root) external onlyRole(ADMIN_ROLE) {
        merkleRoot = _root;
        emit RootUpdated(_root);
    }

    // leaf is keccak256(abi.encodePacked(user, cumulativeAmount))
    function claimForUser(
        address user,
        uint256 cumulativeAmount,
        bytes32[] calldata proof
    ) external onlyRole(ADMIN_ROLE) {
        bytes32 leaf = keccak256(abi.encodePacked(user, cumulativeAmount));
        require(
            MerkleProof.verifyCalldata(proof, merkleRoot, leaf),
            "bad proof"
        );

        uint256 already = claimed[user];
        require(cumulativeAmount > already, "nothing to claim");
        uint256 toSend = cumulativeAmount - already;

        claimed[user] = cumulativeAmount;
        require(amdToken.transfer(user, toSend), "transfer failed");
        emit Claimed(user, toSend);
    }
}
