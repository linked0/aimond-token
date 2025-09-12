import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { LoyaltyPoint, AimondToken } from "../typechain-types";

describe("LoyaltyPoint", function () {
    let loyaltyPoint: LoyaltyPoint;
    let aimondToken: AimondToken;
    let owner: SignerWithAddress;
    let admin: SignerWithAddress;
    let other: SignerWithAddress;

    const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

    beforeEach(async function () {
        [owner, admin, other] = await ethers.getSigners();

        const AimondTokenFactory = await ethers.getContractFactory("AimondToken");
        aimondToken = await AimondTokenFactory.deploy(owner.address);
        await aimondToken.waitForDeployment();

        const LoyaltyPointFactory = await ethers.getContractFactory("LoyaltyPoint");
        loyaltyPoint = await LoyaltyPointFactory.deploy(
            aimondToken.target,
            ethers.ZeroHash
        );
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