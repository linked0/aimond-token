import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Aimond, AimondToken, TokenVesting } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("TokenVesting", function () {
    let owner: SignerWithAddress, investor1: SignerWithAddress, founder1: SignerWithAddress, partner1: SignerWithAddress;
    let amdToken: AimondToken, vestingContract: TokenVesting;
    let aimToken: Aimond;

    beforeEach(async function () {
        [owner, investor1, founder1, partner1] = await ethers.getSigners();
        amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        aimToken = await ethers.deployContract("Aimond");
        vestingContract = await ethers.deployContract("TokenVesting", [owner.address, await aimToken.getAddress(), await amdToken.getAddress()]);

        // Transfer AMD to vesting contract
        await amdToken.connect(owner).transfer(await vestingContract.getAddress(), ethers.parseUnits("88000000000", 18));
        await amdToken.connect(owner).approve(await vestingContract.getAddress(), ethers.parseUnits("88000000000", 18));
    });

    describe("Investor Vesting", function () {
        const scheduleAmount = ethers.parseUnits("10000", 8);

        beforeEach(async function () {
            // Transfer AIM to investor1
            await aimToken.connect(owner).transfer(investor1.address, scheduleAmount);
        });

        it("Should create investor vesting schedule and release AMD tokens", async function () {
            const listingTimestamp = await time.latest();
            await vestingContract.connect(owner).createInvestorVesting(
                investor1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            let schedule = await vestingContract.vestingSchedules(investor1.address);
            expect(await aimToken.balanceOf(investor1.address)).to.equal(scheduleAmount);

            const cliffEndsTimestamp = listingTimestamp + (364 * 24 * 60 * 60);
            await time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60));

            await vestingContract.connect(investor1).claim();

            schedule = await vestingContract.vestingSchedules(investor1.address);
            expect(await aimToken.balanceOf(investor1.address)).to.equal(scheduleAmount);
            expect(await amdToken.balanceOf(investor1.address)).to.be.closeTo(scheduleAmount / 36n, 1);
        });
    });

    describe("Founder Vesting", function () {
        const scheduleAmount = ethers.parseUnits("20000", 8);

        beforeEach(async function () {
            // Transfer AIM to founder1
            await aimToken.connect(owner).transfer(founder1.address, scheduleAmount);
        });

        it("Should create founder vesting schedule and release AMD tokens", async function () {
            const listingTimestamp = await time.latest();
            await vestingContract.connect(owner).createFounderVesting(
                founder1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            let schedule = await vestingContract.vestingSchedules(founder1.address);
            expect(await aimToken.balanceOf(founder1.address)).to.equal(scheduleAmount);

            const cliffEndsTimestamp = listingTimestamp + (665 * 24 * 60 * 60);
            await time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60));

            await vestingContract.connect(founder1).claim();

            schedule = await vestingContract.vestingSchedules(founder1.address);
            expect(await aimToken.balanceOf(founder1.address)).to.equal(scheduleAmount);
            expect(await amdToken.balanceOf(founder1.address)).to.be.closeTo(scheduleAmount / 30n, 1);
        });

        it("Should allow owner to release tokens to founder", async function () {
            const listingTimestamp = await time.latest();
            await vestingContract.connect(owner).createFounderVesting(
                founder1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            let schedule = await vestingContract.vestingSchedules(founder1.address);
            expect(await aimToken.balanceOf(founder1.address)).to.equal(scheduleAmount);

            const cliffEndsTimestamp = listingTimestamp + (665 * 24 * 60 * 60);
            await time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60));

            await vestingContract.connect(owner).releaseTo(founder1.address);

            schedule = await vestingContract.vestingSchedules(founder1.address);
            expect(await aimToken.balanceOf(founder1.address)).to.equal(scheduleAmount);
            expect(await amdToken.balanceOf(founder1.address)).to.be.closeTo(scheduleAmount / 30n, 1);
        });
    });

    describe("Partner Vesting", function () {
        const scheduleAmount = ethers.parseUnits("5000", 8);

        beforeEach(async function () {
            // Transfer AIM to partner1
            await aimToken.connect(owner).transfer(partner1.address, scheduleAmount);
        });

        it("Should create partner vesting schedule and release AMD tokens", async function () {
            const listingTimestamp = await time.latest();
            await vestingContract.connect(owner).createPartnerVesting(
                partner1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            let schedule = await vestingContract.vestingSchedules(partner1.address);
            expect(await aimToken.balanceOf(partner1.address)).to.equal(scheduleAmount);

            const cliffEndsTimestamp = listingTimestamp + (970 * 24 * 60 * 60);
            await time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60));

            await vestingContract.connect(partner1).claim();

            schedule = await vestingContract.vestingSchedules(partner1.address);
            expect(await aimToken.balanceOf(partner1.address)).to.equal(scheduleAmount);
            expect(await amdToken.balanceOf(partner1.address)).to.equal(scheduleAmount);
        });
    });
});
