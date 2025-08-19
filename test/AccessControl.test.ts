import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { EmployeeVestingToken, AimondToken } from "../typechain-types";

describe("BaseVestingToken AccessControl", function () {
    let BaseVestingToken: EmployeeVestingToken;
    let AimondToken: AimondToken;
    let owner: SignerWithAddress;
    let initialDistributorManager: SignerWithAddress;
    let addr2: SignerWithAddress;
    let addr3: SignerWithAddress;
    let addrs: SignerWithAddress[];

    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
    const DISTRIBUTOR_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_MANAGER_ROLE"));

    beforeEach(async function () {
        [owner, initialDistributorManager, addr2, addr3, ...addrs] = await ethers.getSigners();

        const AimondTokenFactory = await ethers.getContractFactory("AimondToken");
        AimondToken = await AimondTokenFactory.deploy(owner.address);
        await AimondToken.waitForDeployment();

        const EmployeeVestingTokenFactory = await ethers.getContractFactory("EmployeeVestingToken");
        BaseVestingToken = await EmployeeVestingTokenFactory.deploy(
            owner.address,
            initialDistributorManager.address,
            AimondToken.target
        );
        await BaseVestingToken.waitForDeployment();
    });

    describe("Role Assignments on Deployment", function () {
        it("Should grant DEFAULT_ADMIN_ROLE to the initialOwner", async function () {
            expect(await BaseVestingToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
        });

        it("Should grant DISTRIBUTOR_MANAGER_ROLE to initialOwner and initialDistributorManager", async function () {
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_MANAGER_ROLE, owner.address)).to.be.true;
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_MANAGER_ROLE, initialDistributorManager.address)).to.be.true;
        });

        it("Should grant DISTRIBUTOR_ROLE to initialOwner and initialDistributorManager", async function () {
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_ROLE, owner.address)).to.be.true;
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_ROLE, initialDistributorManager.address)).to.be.true;
        });
    });

    describe("Distributor Manager Management", function () {
        it("Should allow DEFAULT_ADMIN_ROLE to add a new distributor manager", async function () {
            await expect(BaseVestingToken.connect(owner).addDistributorManager(addr2.address))
                .to.emit(BaseVestingToken, "RoleGranted")
                .withArgs(DISTRIBUTOR_MANAGER_ROLE, addr2.address, owner.address);
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_MANAGER_ROLE, addr2.address)).to.be.true;
        });

        it("Should allow DEFAULT_ADMIN_ROLE to remove a distributor manager", async function () {
            await BaseVestingToken.connect(owner).addDistributorManager(addr2.address);
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_MANAGER_ROLE, addr2.address)).to.be.true;

            await expect(BaseVestingToken.connect(owner).removeDistributorManager(addr2.address))
                .to.emit(BaseVestingToken, "RoleRevoked")
                .withArgs(DISTRIBUTOR_MANAGER_ROLE, addr2.address, owner.address);
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_MANAGER_ROLE, addr2.address)).to.be.false;
        });

        it("Should not allow non-admin to add or remove a distributor manager", async function () {
            await expect(BaseVestingToken.connect(initialDistributorManager).addDistributorManager(addr2.address))
                .to.be.revertedWithCustomError(BaseVestingToken, "AccessControlUnauthorizedAccount")
                .withArgs(initialDistributorManager.address, DEFAULT_ADMIN_ROLE);

            await expect(BaseVestingToken.connect(initialDistributorManager).removeDistributorManager(owner.address))
                .to.be.revertedWithCustomError(BaseVestingToken, "AccessControlUnauthorizedAccount")
                .withArgs(initialDistributorManager.address, DEFAULT_ADMIN_ROLE);
        });
    });

    describe("Distributor Management", function () {
        it("Should allow DISTRIBUTOR_MANAGER_ROLE to add a distributor", async function () {
            await expect(BaseVestingToken.connect(initialDistributorManager).addDistributor(addr2.address))
                .to.emit(BaseVestingToken, "DistributorAdded")
                .withArgs(addr2.address);
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_ROLE, addr2.address)).to.be.true;
        });

        it("Should not allow non-DISTRIBUTOR_MANAGER_ROLE to add a distributor", async function () {
            await expect(BaseVestingToken.connect(addr2).addDistributor(addr3.address))
                .to.be.revertedWithCustomError(BaseVestingToken, "AccessControlUnauthorizedAccount")
                .withArgs(addr2.address, DISTRIBUTOR_MANAGER_ROLE);
        });

        it("Should allow DISTRIBUTOR_MANAGER_ROLE to remove a distributor", async function () {
            await BaseVestingToken.connect(initialDistributorManager).addDistributor(addr2.address);
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_ROLE, addr2.address)).to.be.true;

            await expect(BaseVestingToken.connect(initialDistributorManager).removeDistributor(addr2.address))
                .to.emit(BaseVestingToken, "DistributorRemoved")
                .withArgs(addr2.address);
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_ROLE, addr2.address)).to.be.false;
        });

        it("Should not allow non-DISTRIBUTOR_MANAGER_ROLE to remove a distributor", async function () {
            await BaseVestingToken.connect(initialDistributorManager).addDistributor(addr2.address);
            await expect(BaseVestingToken.connect(addr3).removeDistributor(addr2.address))
                .to.be.revertedWithCustomError(BaseVestingToken, "AccessControlUnauthorizedAccount")
                .withArgs(addr3.address, DISTRIBUTOR_MANAGER_ROLE);
        });
    });
});
