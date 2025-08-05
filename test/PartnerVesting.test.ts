import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Aimond, AimondToken, PartnerVesting } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PartnerVesting", function () {
    let owner: SignerWithAddress, partner1: SignerWithAddress;
    let amdToken: AimondToken, vestingContract: PartnerVesting;
    beforeEach(async function () {
        [owner, partner1] = await ethers.getSigners();
        amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        vestingContract = await ethers.deployContract("PartnerVesting", [owner.address, await amdToken.getAddress()]);
        await amdToken.connect(owner).transfer(await vestingContract.getAddress(), ethers.parseUnits("88000000000", 18)); // Transfer AMD to vesting contract
        await amdToken.connect(owner).approve(await vestingContract.getAddress(), ethers.parseUnits("88000000000", 18)); // Approve AMD for vesting contract
    });

    it("Should follow a 32-month cliff with a single release", async function () {
        const scheduleAmount = 5000;
        const listingTimestamp = await time.latest();
        await vestingContract.connect(owner).createVestingSchedule(partner1.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        let schedule = await vestingContract.vestingSchedules(partner1.address, 0);
        expect(schedule.totalAmount).to.equal(ethers.parseUnits(scheduleAmount.toString(), 18));

        const cliffEndsTimestamp = listingTimestamp + (970 * 24 * 60 * 60);
        await time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60));

        await vestingContract.connect(partner1).claim();

        schedule = await vestingContract.vestingSchedules(partner1.address, 0);
        expect(schedule.totalAmount).to.equal(ethers.parseUnits(scheduleAmount.toString(), 18));
        expect(await amdToken.balanceOf(partner1.address)).to.equal(ethers.parseUnits("5000", 18));
    });

    it("Should allow owner to remove a schedule before the start time", async function () {
        const scheduleAmount = 5000;
        await vestingContract.connect(owner).createVestingSchedule(partner1.address, scheduleAmount);

        let schedule = await vestingContract.vestingSchedules(partner1.address, 0);
        expect(schedule.totalAmount).to.equal(ethers.parseUnits(scheduleAmount.toString(), 18));

        await vestingContract.connect(owner).removeSchedule(partner1.address, 0);

        await expect(vestingContract.vestingSchedules(partner1.address, 0)).to.be.reverted;
    });

    
});