import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { EmployeeVestingToken, AimondToken } from "../typechain-types";
import { strict as assert } from "assert";

describe("BaseVestingToken AccessControl", function () {
    let BaseVestingToken: EmployeeVestingToken;
    let AimondToken: AimondToken;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;
    let addr3: SignerWithAddress;
    let addr4: SignerWithAddress;
    let addr5: SignerWithAddress;
    let addr6: SignerWithAddress;
    let addr7: SignerWithAddress;
    let addrs: SignerWithAddress[];

    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, ...addrs] = await ethers.getSigners();

        const AimondTokenFactory = await ethers.getContractFactory("AimondToken");
        AimondToken = await AimondTokenFactory.deploy(owner.address);
        await AimondToken.waitForDeployment();

        const EmployeeVestingTokenFactory = await ethers.getContractFactory("EmployeeVestingToken");
        BaseVestingToken = await EmployeeVestingTokenFactory.deploy(
            owner.address,
            AimondToken.target
        );
        await BaseVestingToken.waitForDeployment();
    });

    describe("Role Assignments on Deployment", function () {
        it("Should grant DEFAULT_ADMIN_ROLE to the deployer", async function () {
            expect(await BaseVestingToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
        });

        it("Should grant DISTRIBUTOR_ROLE to the deployer", async function () {
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_ROLE, owner.address)).to.be.true;
        });

        
    });

    describe("addDistributor", function () {
        it("Should allow DEFAULT_ADMIN_ROLE to add a transferer", async function () {
            await expect(BaseVestingToken.connect(owner).addDistributor(addr1.address))
                .to.emit(BaseVestingToken, "DistributorAdded")
                .withArgs(addr1.address);
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_ROLE, addr1.address)).to.be.true;
            expect(await BaseVestingToken.getRoleMemberCount(DISTRIBUTOR_ROLE)).to.equal(2);
        });

        it("Should not allow non-DEFAULT_ADMIN_ROLE to add a transferer", async function () {
            await expect(BaseVestingToken.connect(addr1).addDistributor(addr2.address))
                .to.be.revertedWithCustomError(BaseVestingToken, "AccessControlUnauthorizedAccount")
                .withArgs(addr1.address, DEFAULT_ADMIN_ROLE);
        });

        it("Should not allow adding an account that already has DISTRIBUTOR_ROLE", async function () {
            await BaseVestingToken.connect(owner).addDistributor(addr1.address);
            await expect(BaseVestingToken.connect(owner).addDistributor(addr1.address))
                .to.be.revertedWith("Account already has DISTRIBUTOR_ROLE");
        });

        
    });

    describe("removeDistributor", function () {
        beforeEach(async function () {
            // Add distributors to reach MIN_DISTRIBUTORS + 1 for testing removal
            // Initial: owner (1)
            await BaseVestingToken.connect(owner).addDistributor(addr1.address); // 2 (MIN_DISTRIBUTORS + 1)
            // currentDistributors should be 2
        });

        it("Should allow DEFAULT_ADMIN_ROLE to remove a transferer", async function () {
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_ROLE, addr1.address)).to.be.true;
            await expect(BaseVestingToken.connect(owner).removeDistributor(addr1.address))
                .to.emit(BaseVestingToken, "DistributorRemoved")
                .withArgs(addr1.address);
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_ROLE, addr1.address)).to.be.false;
            expect(await BaseVestingToken.getRoleMemberCount(DISTRIBUTOR_ROLE)).to.equal(1); // Should be MIN_DISTRIBUTORS
        });

        it("Should not allow non-DEFAULT_ADMIN_ROLE to remove a transferer", async function () {
            await expect(BaseVestingToken.connect(addr1).removeDistributor(addr2.address))
                .to.be.revertedWithCustomError(BaseVestingToken, "AccessControlUnauthorizedAccount")
                .withArgs(addr1.address, DEFAULT_ADMIN_ROLE);
        });

        it("Should not allow removing an account that does not have DISTRIBUTOR_ROLE", async function () {
            // addr7 is not added as a transferer in beforeEach
            expect(await BaseVestingToken.hasRole(DISTRIBUTOR_ROLE, addr7.address)).to.be.false;
            await expect(BaseVestingToken.connect(owner).removeDistributor(addr7.address))
                .to.be.revertedWith("Account does not have DISTRIBUTOR_ROLE");
        });

        
    });

    describe("createVesting", function () {
        const vestingAmount = ethers.parseEther("1000");

        beforeEach(async function () {
            // Ensure beneficiary has tokens before creating vesting schedule
            await BaseVestingToken.connect(owner).transfer(addr1.address, vestingAmount);
        });

        it("Should allow owner to create a vesting schedule with matching totalAmount", async function () {
            const tx = await BaseVestingToken.connect(owner).createVesting(addr1.address, vestingAmount);
            const receipt = await tx.wait();
            const event = receipt?.logs.find((log: any) => {
                try {
                    return BaseVestingToken.interface.parseLog(log)?.name === "VestingScheduleCreated";
                } catch (e) {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            const parsedEvent = BaseVestingToken.interface.parseLog(event as any);

            console.log("parsedEvent?.args:", parsedEvent?.args);

            assert.strictEqual(parsedEvent?.args[0], addr1.address);
            assert.strictEqual(parsedEvent?.args[1], BigInt(960 * 86400));
            assert.strictEqual(parsedEvent?.args[2], BigInt(0));
            assert.strictEqual(parsedEvent?.args[3], BigInt(1));
            assert.strictEqual(parsedEvent?.args[4], vestingAmount);
            const schedule = await BaseVestingToken.vestingSchedules(addr1.address);
            expect(schedule.totalAmount).to.equal(vestingAmount);
        });

        it("Should not allow creating a vesting schedule if totalAmount does not match beneficiary's balance", async function () {
            const mismatchedAmount = ethers.parseEther("900");
            await expect(BaseVestingToken.connect(owner).createVesting(addr1.address, mismatchedAmount))
                .to.be.revertedWith("Total amount must match beneficiary's balance");
        });

        it("Should not allow creating a vesting schedule if beneficiary has no tokens", async function () {
            await expect(BaseVestingToken.connect(owner).createVesting(addr7.address, ethers.parseEther("100")))
                .to.be.revertedWith("Total amount must match beneficiary's balance"); // Reverts with this message due to 0 balance
        });

        it("Should not allow creating a vesting schedule if one already exists", async function () {
            await BaseVestingToken.connect(owner).createVesting(addr1.address, vestingAmount);
            
            await expect(BaseVestingToken.connect(owner).createVesting(addr1.address, vestingAmount))
                .to.be.reverted;
        });
    });

    describe("transfer and transferFrom permissions", function () {
        const initialSupply = ethers.parseEther("1000000");
        const transferAmount = ethers.parseEther("100");

        beforeEach(async function () {
            // Initial supply is minted to owner in constructor
            // Ensure addr1 has tokens for transferFrom tests
            await BaseVestingToken.connect(owner).transfer(addr1.address, transferAmount);
        });

        it("Should allow DISTRIBUTOR_ROLE to call transfer", async function () {
            // owner has DISTRIBUTOR_ROLE by default
            await expect(BaseVestingToken.connect(owner).transfer(addr2.address, transferAmount))
                .to.changeTokenBalance(BaseVestingToken, addr2, transferAmount);
        });

        it("Should not allow non-DISTRIBUTOR_ROLE to call transfer", async function () {
            // addr7 does not have DISTRIBUTOR_ROLE
            await expect(BaseVestingToken.connect(addr7).transfer(addr2.address, transferAmount))
                .to.be.revertedWithCustomError(BaseVestingToken, "AccessControlUnauthorizedAccount")
                .withArgs(addr7.address, DISTRIBUTOR_ROLE);
        });

        it("Should allow DISTRIBUTOR_ROLE to call transferFrom", async function () {
            // Approve owner to spend addr1's tokens
            await BaseVestingToken.connect(addr1).approve(owner.address, transferAmount);
            console.log("Allowance after approve:", await BaseVestingToken.allowance(addr1.address, owner.address));
            // owner has DISTRIBUTOR_ROLE by default
            await expect(BaseVestingToken.connect(owner).transferFrom(addr1.address, addr2.address, transferAmount))
                .to.changeTokenBalances(BaseVestingToken, [addr1, addr2], [-transferAmount, transferAmount]);
        });

        it("Should not allow non-DISTRIBUTOR_ROLE to call transferFrom", async function () {
            // Approve owner to spend addr1's tokens
            await BaseVestingToken.connect(addr1).approve(owner.address, transferAmount);
            // addr7 does not have DISTRIBUTOR_ROLE
            await expect(BaseVestingToken.connect(addr7).transferFrom(addr1.address, addr2.address, transferAmount))
                .to.be.revertedWithCustomError(BaseVestingToken, "AccessControlUnauthorizedAccount")
                .withArgs(addr7.address, DISTRIBUTOR_ROLE);
        });
    });
});
