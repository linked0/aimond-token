import { ethers } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner, SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
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

  it("should allow an admin to claim tokens for a user with a valid proof", async function () {
    const leaf = keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user1.address, 100]).slice(2), 'hex'));
    const proof = merkleTree.getHexProof(leaf);

    await loyaltyPoint.connect(owner).claimForUser(user1.address, 100, proof);

    expect(await amdToken.balanceOf(user1.address)).to.equal(100);
    expect(await loyaltyPoint.claimed(user1.address)).to.equal(100);
  });

  it("should not allow an admin to claim tokens for a user with an invalid proof", async function () {
    const invalidProof = merkleTree.getHexProof(keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user2.address, 100]).slice(2), 'hex')));

    await expect(loyaltyPoint.connect(owner).claimForUser(user1.address, 100, invalidProof)).to.be.revertedWith("bad proof");
  });

  it("should not allow an admin to claim more than the cumulative amount for a user", async function () {
    const leaf = keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user1.address, 100]).slice(2), 'hex'));
    const proof = merkleTree.getHexProof(leaf);

    await loyaltyPoint.connect(owner).claimForUser(user1.address, 100, proof);

    await expect(loyaltyPoint.connect(owner).claimForUser(user1.address, 100, proof)).to.be.revertedWith("nothing to claim");
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

  it("should allow an admin to claim tokens for a user after the merkle root has been updated", async function () {
    const newLeaves = [user1, user2].map((user) =>
        keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user.address, 200]).slice(2), 'hex'))
    );
    const newMerkleTree = new MerkleTree(newLeaves, keccak256, { sortPairs: true });
    const newRoot = newMerkleTree.getHexRoot();

    await loyaltyPoint.connect(owner).updateRoot(newRoot);

    const leaf = keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user1.address, 200]).slice(2), 'hex'));
    const proof = newMerkleTree.getHexProof(leaf);

    await loyaltyPoint.connect(owner).claimForUser(user1.address, 200, proof);

    expect(await amdToken.balanceOf(user1.address)).to.equal(200);
    expect(await loyaltyPoint.claimed(user1.address)).to.equal(200);
  });

  it("should emit a Claimed event on successful claim", async function () {
    const leaf = keccak256(Buffer.from(ethers.solidityPacked(["address", "uint256"], [user1.address, 100]).slice(2), 'hex'));
    const proof = merkleTree.getHexProof(leaf);

    await expect(loyaltyPoint.connect(owner).claimForUser(user1.address, 100, proof))
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

describe("LoyaltyPoint Access Control", function () {
    let loyaltyPoint: LoyaltyPoint;
    let aimondToken: AimondToken;
    let owner: SignerWithAddress;
    let admin: SignerWithAddress;
    let other: SignerWithAddress;

    const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

    beforeEach(async function () {
        [owner, admin, other] = await ethers.getSigners();

        aimondToken = await ethers.deployContract("AimondToken", [owner.address]);
        await aimondToken.waitForDeployment();

        loyaltyPoint = await ethers.deployContract("LoyaltyPoint", [
            aimondToken.target,
            ethers.ZeroHash
        ]);
        await loyaltyPoint.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should grant DEFAULT_ADMIN_ROLE to the deployer", async function () {
            expect(await loyaltyPoint.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
        });

        it("Should grant ADMIN_ROLE to the deployer", async function () {
            expect(await loyaltyPoint.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
        });
    });

    describe("Admin Role", function () {
        it("Should allow admin to update root", async function () {
            const newRoot = ethers.keccak256(ethers.toUtf8Bytes("new_root"));
            await expect(loyaltyPoint.connect(owner).updateRoot(newRoot))
                .to.emit(loyaltyPoint, "RootUpdated")
                .withArgs(newRoot);
            expect(await loyaltyPoint.merkleRoot()).to.equal(newRoot);
        });

        it("Should not allow non-admin to update root", async function () {
            const newRoot = ethers.keccak256(ethers.toUtf8Bytes("new_root"));
            await expect(loyaltyPoint.connect(other).updateRoot(newRoot))
                .to.be.revertedWithCustomError(loyaltyPoint, "AccessControlUnauthorizedAccount")
                .withArgs(other.address, ADMIN_ROLE);
        });
    });
});
