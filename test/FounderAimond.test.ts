import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AimondToken, FounderAimond } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FounderAimond", function () {
    let owner: SignerWithAddress, founder1: SignerWithAddress;
    let amdToken: AimondToken, vestingContract: FounderAimond;
    beforeEach(async function () {
        [owner, founder1] = await ethers.getSigners();
        amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        vestingContract = await ethers.deployContract("FounderAimond", [owner.address, await amdToken.getAddress()]);
                await amdToken.connect(owner).transfer(await vestingContract.getAddress(), await vestingContract.TOTAL_SUPPLY());
                await amdToken.connect(owner).transfer(await vestingContract.getAddress(), await vestingContract.TOTAL_SUPPLY());
    });

    it("Should follow a 22-month cliff and 10 monthly installments", async function () {
        const scheduleAmount = ethers.parseUnits("20000", 18);
        const listingTimestamp = await time.latest();
        await vestingContract.connect(owner).createVestingSchedule(founder1.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        expect(await vestingContract.balanceOf(founder1.address)).to.equal(scheduleAmount);

        const cliffEndsTimestamp = listingTimestamp + (665 * 24 * 60 * 60);
        await time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60));

        await vestingContract.connect(founder1).releaseVestedTokens();

        expect(await vestingContract.balanceOf(founder1.address)).to.equal(scheduleAmount);
        expect(await amdToken.balanceOf(founder1.address)).to.be.closeTo(scheduleAmount / 10n, 1);
    });

    
});