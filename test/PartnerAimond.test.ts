import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AimondToken, PartnerAimond } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PartnerAimond", function () {
    let owner: SignerWithAddress, partner1: SignerWithAddress;
    let amdToken: AimondToken, vestingContract: PartnerAimond;
    beforeEach(async function () {
        [owner, partner1] = await ethers.getSigners();
        amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        vestingContract = await ethers.deployContract("PartnerAimond", [owner.address, await amdToken.getAddress()]);
                await amdToken.connect(owner).transfer(await vestingContract.getAddress(), await vestingContract.TOTAL_SUPPLY());
                await amdToken.connect(owner).approve(await vestingContract.getAddress(), await vestingContract.TOTAL_SUPPLY());
    });

    it("Should follow a 32-month cliff with a single release", async function () {
        const scheduleAmount = ethers.parseUnits("5000", 18);
        const listingTimestamp = await time.latest();
        await vestingContract.connect(owner).createVestingSchedule(partner1.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        expect(await vestingContract.balanceOf(partner1.address)).to.equal(scheduleAmount);

        const cliffEndsTimestamp = listingTimestamp + (970 * 24 * 60 * 60);
        await time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60));

        await vestingContract.connect(partner1).releaseVestedTokens();

        expect(await vestingContract.balanceOf(partner1.address)).to.equal(scheduleAmount);
        expect(await amdToken.balanceOf(partner1.address)).to.equal(scheduleAmount);
    });

    
});