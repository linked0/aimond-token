import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AimondToken, AIMAimond } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("InvestorVesting", function () {
    let owner: SignerWithAddress, investor1: SignerWithAddress;
    let amdToken: AimondToken, vestingContract: AIMAimond;
    beforeEach(async function () {
        [owner, investor1] = await ethers.getSigners();
        amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        vestingContract = await ethers.deployContract("AIMAimond", [owner.address, await amdToken.getAddress()]);
        await amdToken.connect(owner).transfer(await vestingContract.getAddress(), await vestingContract.groupAllocationCap());
        await amdToken.connect(owner).approve(await vestingContract.getAddress(), await vestingContract.groupAllocationCap());
    });

    it("Should mint ledger tokens and release real AMD tokens", async function () {
        const scheduleAmount = ethers.parseUnits("10000", 18);
        const listingTimestamp = await time.latest();
        await vestingContract.connect(owner).createVestingSchedule(investor1.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        expect(await vestingContract.balanceOf(investor1.address)).to.equal(scheduleAmount);

        const cliffEndsTimestamp = listingTimestamp + (364 * 24 * 60 * 60);
        await time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60));

        await vestingContract.connect(investor1).releaseVestedTokens();

        expect(await vestingContract.balanceOf(investor1.address)).to.equal(scheduleAmount);
        expect(await amdToken.balanceOf(investor1.address)).to.be.closeTo(scheduleAmount / 10n, 1);
    });

    
});