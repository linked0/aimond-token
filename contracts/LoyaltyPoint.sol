// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract LoyaltyPoint is Ownable {
    IERC20 public immutable amdToken;
    bytes32 public merkleRoot;

    mapping(address => uint256) public claimed; // total already given (on-chain truth)

    event RootUpdated(bytes32 newRoot);
    event Claimed(address indexed user, uint256 amount);

    constructor(IERC20 _token, bytes32 _root) Ownable(msg.sender) {
        amdToken = _token;
        merkleRoot = _root;
    }

    function updateRoot(bytes32 _root) external onlyOwner {
        merkleRoot = _root;
        emit RootUpdated(_root);
    }

    // leaf is keccak256(abi.encodePacked(user, cumulativeAmount))
    function claim(
        uint256 cumulativeAmount,
        bytes32[] calldata proof
    ) external {
        bytes32 leaf = keccak256(
            abi.encodePacked(msg.sender, cumulativeAmount)
        );
        require(
            MerkleProof.verifyCalldata(proof, merkleRoot, leaf),
            "bad proof"
        );

        uint256 already = claimed[msg.sender];
        require(cumulativeAmount > already, "nothing to claim");
        uint256 toSend = cumulativeAmount - already;

        claimed[msg.sender] = cumulativeAmount; // write new cumulative
        require(amdToken.transfer(msg.sender, toSend), "transfer failed");
        emit Claimed(msg.sender, toSend);
    }
}
