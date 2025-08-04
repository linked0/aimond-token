import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Aimond, AimondToken, FounderVesting } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FounderVesting", function () {
    let owner: SignerWithAddress, founder1: SignerWithAddress;
    let amdToken: AimondToken, vestingContract: FounderVesting;
    let aimToken: Aimond;
    beforeEach(async function () {
        [owner, founder1] = await ethers.getSigners();
        amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        aimToken = await ethers.deployContract("Aimond");
        vestingContract = await ethers.deployContract("FounderVesting", [owner.address, await aimToken.getAddress(), await amdToken.getAddress()]);
        await aimToken.connect(owner).transfer(await vestingContract.getAddress(), await vestingContract.groupAllocationCap());
        await aimToken.connect(owner).approve(await vestingContract.getAddress(), await vestingContract.groupAllocationCap());
        await amdToken.connect(owner).transfer(await vestingContract.getAddress(), ethers.parseUnits("88000000000", 18)); // Transfer AMD to vesting contract
        await amdToken.connect(owner).approve(await vestingContract.getAddress(), ethers.parseUnits("88000000000", 18)); // Approve AMD for vesting contract
    });

    it("Should follow a 22-month cliff and 10 monthly installments", async function () {
        const scheduleAmount = ethers.parseUnits("20000", 8);
        const listingTimestamp = await time.latest();
        await vestingContract.connect(owner).createVestingSchedule(founder1.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        let schedule = await vestingContract.vestingSchedules(founder1.address, 0);
        expect(schedule.totalAmount).to.equal(scheduleAmount);

        const cliffEndsTimestamp = listingTimestamp + (665 * 24 * 60 * 60);
        await time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60));

        await vestingContract.connect(founder1).releaseVestedTokens();

        schedule = await vestingContract.vestingSchedules(founder1.address, 0);
        expect(schedule.totalAmount).to.equal(scheduleAmount);
        expect(await amdToken.balanceOf(founder1.address)).to.be.closeTo(scheduleAmount / 10n, 1);
    });

    
});