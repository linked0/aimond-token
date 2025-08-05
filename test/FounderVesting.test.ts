import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Aimond, AimondToken, FounderVesting } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FounderVesting", function () {
    let owner: SignerWithAddress, founder1: SignerWithAddress;
    let amdToken: AimondToken, vestingContract: FounderVesting;
    beforeEach(async function () {
        [owner, founder1] = await ethers.getSigners();
        amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        vestingContract = await ethers.deployContract("FounderVesting", [owner.address, await amdToken.getAddress()]);
        await amdToken.connect(owner).transfer(await vestingContract.getAddress(), ethers.parseUnits("88000000000", 18)); // Transfer AMD to vesting contract
        await amdToken.connect(owner).approve(await vestingContract.getAddress(), ethers.parseUnits("88000000000", 18)); // Approve AMD for vesting contract
    });

    it("Should follow a 22-month cliff and 10 monthly installments", async function () {
        const scheduleAmount = 20000;
        const listingTimestamp = await time.latest();
        await vestingContract.connect(owner).createVestingSchedule(founder1.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        let schedule = await vestingContract.vestingSchedules(founder1.address, 0);
        expect(schedule.totalAmount).to.equal(ethers.parseUnits(scheduleAmount.toString(), 18));

        const cliffEndsTimestamp = listingTimestamp + (665 * 24 * 60 * 60);
        await time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60));

        await vestingContract.connect(founder1).claim();

        schedule = await vestingContract.vestingSchedules(founder1.address, 0);
        expect(schedule.totalAmount).to.equal(ethers.parseUnits(scheduleAmount.toString(), 18));
        expect(await amdToken.balanceOf(founder1.address)).to.be.closeTo(ethers.parseUnits("2000", 18), 1);
    });

    

    it("Should allow beneficiary to cancel their own schedules before start time", async function () {
        const scheduleAmount1 = BigInt(10000);
        const scheduleAmount2 = BigInt(5000);
        await vestingContract.connect(owner).createVestingSchedule(founder1.address, scheduleAmount1);
        await vestingContract.connect(owner).createVestingSchedule(founder1.address, scheduleAmount2);

        expect(await vestingContract.getVestingScheduleCount(founder1.address)).to.equal(2);

        const initialCumulativeVestedAmount = await vestingContract.cumulativeVestedAmount();

        await expect(vestingContract.connect(founder1).cancelMySchedules())
            .to.emit(vestingContract, "SchedulesCancelled")
            .withArgs(founder1.address, BigInt(scheduleAmount1 + scheduleAmount2));

        await expect(vestingContract.vestingSchedules(founder1.address, 0)).to.be.reverted;
        expect(await vestingContract.cumulativeVestedAmount()).to.equal(initialCumulativeVestedAmount - (scheduleAmount1 + scheduleAmount2));

        // Should revert if globalStartTime is set
        const listingTimestamp = await time.latest();
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        await vestingContract.connect(owner).createVestingSchedule(founder1.address, scheduleAmount1);
        await expect(vestingContract.connect(founder1).cancelMySchedules())
            .to.be.revertedWith("Vesting has started, cannot cancel schedules");
    });

    
});