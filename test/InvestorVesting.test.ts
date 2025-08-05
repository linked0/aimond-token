import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Aimond, AimondToken, InvestorVesting } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("InvestorVesting", function () {
    let owner: SignerWithAddress, investor1: SignerWithAddress;
    let amdToken: AimondToken, vestingContract: InvestorVesting;
    beforeEach(async function () {
        [owner, investor1] = await ethers.getSigners();
        amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        vestingContract = await ethers.deployContract("InvestorVesting", [owner.address, await amdToken.getAddress()]);
        await amdToken.connect(owner).transfer(await vestingContract.getAddress(), ethers.parseUnits("88000000000", 18)); // Transfer AMD to vesting contract
        await amdToken.connect(owner).approve(await vestingContract.getAddress(), ethers.parseUnits("88000000000", 18)); // Approve AMD for vesting contract
    });

    it("Should mint ledger tokens and release real AMD tokens", async function () {
        const scheduleAmount = 10000;
        const listingTimestamp = await time.latest();
        await vestingContract.connect(owner).createVestingSchedule(investor1.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        let schedule = await vestingContract.vestingSchedules(investor1.address, 0);
        expect(schedule.totalAmount).to.equal(ethers.parseUnits(scheduleAmount.toString(), 18));

        const cliffEndsTimestamp = listingTimestamp + (364 * 24 * 60 * 60);
        await time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60));

        await vestingContract.connect(investor1).claim();

        schedule = await vestingContract.vestingSchedules(investor1.address, 0);
        expect(schedule.totalAmount).to.equal(ethers.parseUnits(scheduleAmount.toString(), 18));
        expect(await amdToken.balanceOf(investor1.address)).to.be.closeTo(ethers.parseUnits("1000", 18), 1);
    });

    

    
});