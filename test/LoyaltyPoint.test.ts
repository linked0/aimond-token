import { ethers } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { LoyaltyPoint, AimondToken } from "../typechain-types";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

describe("LoyaltyPoint", function () {
  let loyaltyPoint: LoyaltyPoint;
  let amdToken: AimondToken;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let users: HardhatEthersSigner[];
  let merkleTree: MerkleTree;
  let root: string;

  beforeEach(async function () {
    [owner, user1, user2, ...users] = await ethers.getSigners();

    amdToken = await ethers.deployContract("AimondToken", [owner.address]);

    const leaves = [user1, user2].map((user) =>
      keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user.address, 100]).slice(2), 'hex'))
    );
    merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    root = merkleTree.getHexRoot();

    loyaltyPoint = await ethers.deployContract("LoyaltyPoint", [
      await amdToken.getAddress(),
      root,
    ]);

    await amdToken.transfer(await loyaltyPoint.getAddress(), ethers.parseUnits("31600000000", 18));
  });

  it("should allow a user to claim tokens with a valid proof", async function () {
    const leaf = keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user1.address, 100]).slice(2), 'hex'));
    const proof = merkleTree.getHexProof(leaf);

    await loyaltyPoint.connect(user1).claim(100, proof);

    expect(await amdToken.balanceOf(user1.address)).to.equal(100);
    expect(await loyaltyPoint.claimed(user1.address)).to.equal(100);
  });

  it("should not allow a user to claim tokens with an invalid proof", async function () {
    const invalidProof = merkleTree.getHexProof(keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user2.address, 100]).slice(2), 'hex')));

    await expect(loyaltyPoint.connect(user1).claim(100, invalidProof)).to.be.revertedWith("bad proof");
  });

  it("should not allow a user to claim more than their cumulative amount", async function () {
    const leaf = keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user1.address, 100]).slice(2), 'hex'));
    const proof = merkleTree.getHexProof(leaf);

    await loyaltyPoint.connect(user1).claim(100, proof);

    await expect(loyaltyPoint.connect(user1).claim(100, proof)).to.be.revertedWith("nothing to claim");
  });

  it("should allow the owner to update the merkle root", async function () {
    const newLeaves = [user1, user2].map((user) =>
        keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user.address, 200]).slice(2), 'hex'))
    );
    const newMerkleTree = new MerkleTree(newLeaves, keccak256, { sortPairs: true });
    const newRoot = newMerkleTree.getHexRoot();

    await loyaltyPoint.connect(owner).updateRoot(newRoot);

    expect(await loyaltyPoint.merkleRoot()).to.equal(newRoot);
  });

  it("should allow a user to claim tokens after the merkle root has been updated", async function () {
    const newLeaves = [user1, user2].map((user) =>
        keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user.address, 200]).slice(2), 'hex'))
    );
    const newMerkleTree = new MerkleTree(newLeaves, keccak256, { sortPairs: true });
    const newRoot = newMerkleTree.getHexRoot();

    await loyaltyPoint.connect(owner).updateRoot(newRoot);

    const leaf = keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user1.address, 200]).slice(2), 'hex'));
    const proof = newMerkleTree.getHexProof(leaf);

    await loyaltyPoint.connect(user1).claim(200, proof);

    expect(await amdToken.balanceOf(user1.address)).to.equal(200);
    expect(await loyaltyPoint.claimed(user1.address)).to.equal(200);
  });

  it("should emit a Claimed event on successful claim", async function () {
    const leaf = keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user1.address, 100]).slice(2), 'hex'));
    const proof = merkleTree.getHexProof(leaf);

    await expect(loyaltyPoint.connect(user1).claim(100, proof))
      .to.emit(loyaltyPoint, "Claimed")
      .withArgs(user1.address, 100);
  });

  it("should emit a RootUpdated event when the root is updated", async function () {
    const newLeaves = [user1, user2].map((user) =>
        keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user.address, 200]).slice(2), 'hex'))
    );
    const newMerkleTree = new MerkleTree(newLeaves, keccak256, { sortPairs: true });
    const newRoot = newMerkleTree.getHexRoot();

    await expect(loyaltyPoint.connect(owner).updateRoot(newRoot))
      .to.emit(loyaltyPoint, "RootUpdated")
      .withArgs(newRoot);
  });
});