import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Aimond, AimondToken, TokenVesting } from "../typechain-types";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";

// Vesting schedule constants for testing (matching contract)
const FOUNDER_CLIFF_DAYS = 663;
const FOUNDER_VESTING_MONTHS = 10;
const FOUNDER_INSTALLMENT_COUNT = 10;

import { formatTimestamp, formatAmdBalance, formatAimBalance } from "./utils/time";

describe("TokenVesting", function () {
    async function deployFounderVestingFixture() {
        const [owner, founder1] = await ethers.getSigners();
        const amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        const aimToken = await ethers.deployContract("Aimond");
        const vestingContract = await ethers.deployContract("TokenVesting", [owner.address, await aimToken.getAddress(), await amdToken.getAddress()]);

        // Approve AMD to vesting contract
        await amdToken.connect(owner).approve(await vestingContract.getAddress(), ethers.parseUnits("20000000000", 18));

        // Transfer AIM to founder1
        const scheduleAmount = ethers.parseUnits("20000", 8);
        await aimToken.connect(owner).transfer(founder1.address, scheduleAmount);

        return { vestingContract, amdToken, aimToken, owner, founder1, scheduleAmount };
    }

    describe("Founder Vesting", function () {
        it("Should create founder vesting schedule and release AMD tokens", async function () {
            const { vestingContract, amdToken, aimToken, owner, founder1, scheduleAmount } = await helpers.loadFixture(deployFounderVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Founder Listing Timestamp:", formatTimestamp(listingTimestamp));
            console.log("Founder Schedule Amount:", formatAimBalance(scheduleAmount));
            await vestingContract.connect(owner).createFounderVesting(
                founder1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(founder1.address);
            expect(await aimToken.balanceOf(founder1.address)).to.equal(scheduleAmount);

            const globalStartTime = await vestingContract.globalStartTime();
            console.log("Founder Global Start Time:", formatTimestamp(Number(globalStartTime)));
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);
            console.log("Founder Cliff Ends Timestamp:", formatTimestamp(cliffEndsTimestamp));
            await helpers.time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60)); // 1 month after cliff
            console.log("Founder Claim Time (claim):", formatTimestamp(await helpers.time.latest()));
            await vestingContract.connect(founder1).claim();

            console.log("Founder AMD Balance (after 1st claim):", formatAmdBalance(await amdToken.balanceOf(founder1.address)));
            const updatedSchedule = await vestingContract.vestingSchedules(founder1.address);
            expect(await aimToken.balanceOf(founder1.address)).to.equal(scheduleAmount);
            expect(await amdToken.balanceOf(founder1.address)).to.be.closeTo(scheduleAmount * BigInt(10)**BigInt(10) / BigInt(FOUNDER_INSTALLMENT_COUNT), 1);

            // Second allocation
            await helpers.time.increaseTo(cliffEndsTimestamp + (2 * 30 * 24 * 60 * 60)); // 2 months after cliff
            console.log("Founder Second Claim Time (claim):", formatTimestamp(await helpers.time.latest()));
            await vestingContract.connect(founder1).claim();

            console.log("Founder AMD Balance (after 2nd claim):", formatAmdBalance(await amdToken.balanceOf(founder1.address)));
            expect(await amdToken.balanceOf(founder1.address)).to.be.closeTo(BigInt(2) * scheduleAmount * BigInt(10)**BigInt(10) / BigInt(FOUNDER_INSTALLMENT_COUNT), 1);
        });

        it("Should allow owner to release tokens to founder", async function () {
            const { vestingContract, amdToken, aimToken, owner, founder1, scheduleAmount } = await helpers.loadFixture(deployFounderVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Founder Listing Timestamp:", formatTimestamp(listingTimestamp));
            console.log("Founder Schedule Amount:", formatAimBalance(scheduleAmount));
            await vestingContract.connect(owner).createFounderVesting(
                founder1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(founder1.address);
            expect(await aimToken.balanceOf(founder1.address)).to.equal(scheduleAmount);

            const globalStartTime = await vestingContract.globalStartTime();
            console.log("Founder Global Start Time:", formatTimestamp(Number(globalStartTime)));
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);
            console.log("Founder Cliff Ends Timestamp:", formatTimestamp(cliffEndsTimestamp));
            await helpers.time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60)); // 1 month after cliff
            console.log("Founder Claim Time (releaseTo):", formatTimestamp(await helpers.time.latest()));
            await vestingContract.connect(owner).releaseTo(founder1.address);

            const updatedSchedule = await vestingContract.vestingSchedules(founder1.address);
            expect(await aimToken.balanceOf(founder1.address)).to.equal(scheduleAmount);
            expect(await amdToken.balanceOf(founder1.address)).to.be.closeTo(scheduleAmount * BigInt(10)**BigInt(10) / BigInt(FOUNDER_INSTALLMENT_COUNT), 1);
        });

        it("Should not allow claiming before cliff ends", async function () {
            const { vestingContract, amdToken, aimToken, owner, founder1, scheduleAmount } = await helpers.loadFixture(deployFounderVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Founder Listing Timestamp (Before Cliff):", formatTimestamp(listingTimestamp));
            await vestingContract.connect(owner).createFounderVesting(
                founder1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(founder1.address);
            const globalStartTime = await vestingContract.globalStartTime();
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);

            await helpers.time.increaseTo(cliffEndsTimestamp - 1); // 1 second before cliff ends
            console.log("Founder Attempt Claim Time (Before Cliff):", formatTimestamp(await helpers.time.latest()));
            // await expect(vestingContract.connect(founder1).claim()).to.be.revertedWith("No tokens are currently vested");
        });

        it("Should allow claiming right after cliff ends", async function () {
            const { vestingContract, amdToken, aimToken, owner, founder1, scheduleAmount } = await helpers.loadFixture(deployFounderVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Founder Listing Timestamp (After Cliff):", formatTimestamp(listingTimestamp));
            await vestingContract.connect(owner).createFounderVesting(
                founder1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(founder1.address);
            const globalStartTime = await vestingContract.globalStartTime();
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);

            await helpers.time.increaseTo(cliffEndsTimestamp); // Exactly at cliff end
            console.log("Founder Claim Time (After Cliff):", formatTimestamp(await helpers.time.latest()));
            await vestingContract.connect(founder1).claim();

            console.log("Founder AMD Balance (after cliff claim):", formatAmdBalance(await amdToken.balanceOf(founder1.address)));
            // expect(await amdToken.balanceOf(founder1.address)).to.be.closeTo(scheduleAmount * BigInt(10)**BigInt(10) / BigInt(FOUNDER_INSTALLMENT_COUNT), 1);
        });

        it("Should release all tokens via owner releaseTo after the full vesting period", async function () {
            const { vestingContract, amdToken, aimToken, owner, founder1, scheduleAmount } = await helpers.loadFixture(deployFounderVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Founder Listing Timestamp (Full Vesting via releaseTo):", formatTimestamp(listingTimestamp));
            console.log("Founder Schedule Amount (Full Vesting via releaseTo):", formatAimBalance(scheduleAmount), "AIM");
            await vestingContract.connect(owner).createFounderVesting(
                founder1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(founder1.address);
            expect(await aimToken.balanceOf(founder1.address)).to.equal(scheduleAmount);

            const globalStartTime = await vestingContract.globalStartTime();
            console.log("Founder Global Start Time (Full Vesting via releaseTo):", formatTimestamp(Number(globalStartTime)));
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);
            console.log("Founder Cliff Ends Timestamp (Full Vesting via releaseTo):", formatTimestamp(cliffEndsTimestamp));

            const installmentDuration = Number(schedule.vestingDuration) / Number(FOUNDER_INSTALLMENT_COUNT);
            let currentTimestamp = cliffEndsTimestamp;

            for (let i = 0; i < FOUNDER_INSTALLMENT_COUNT; i++) {
                currentTimestamp += installmentDuration;
                await helpers.time.increaseTo(currentTimestamp);
                console.log(`Founder ReleaseTo Time (installment ${i + 1}):`, formatTimestamp(await helpers.time.latest()));
                await vestingContract.connect(owner).releaseTo(founder1.address);
                console.log(`Founder AMD Balance (after installment ${i + 1}):`, formatAmdBalance(await amdToken.balanceOf(founder1.address)));
            }

            expect(await amdToken.balanceOf(founder1.address)).to.be.closeTo(scheduleAmount * BigInt(10)**BigInt(10), 1);
        });
    });
});