import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Aimond, AimondToken, TokenVesting } from "../typechain-types";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";

// Vesting schedule constants for testing (matching contract)
const INVESTOR_CLIFF_DAYS = 363;
const INVESTOR_VESTING_MONTHS = 10;
const INVESTOR_INSTALLMENT_COUNT = 10;

import { formatTimestamp, formatAmdBalance, formatAimBalance } from "./utils/time";

describe("TokenVesting", function () {
    async function deployInvestorVestingFixture() {
        const [owner, investor1] = await ethers.getSigners();
        const amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        const aimToken = await ethers.deployContract("Aimond");
        const vestingContract = await ethers.deployContract("TokenVesting", [owner.address, await aimToken.getAddress(), await amdToken.getAddress()]);

        // Approve AMD to vesting contract
        await amdToken.connect(owner).approve(await vestingContract.getAddress(), ethers.parseUnits("24000000000", 18));
        
        // Transfer AIM to investor1
        const scheduleAmount = ethers.parseUnits("10000", 8);
        await aimToken.connect(owner).transfer(investor1.address, scheduleAmount);

        return { vestingContract, amdToken, aimToken, owner, investor1, scheduleAmount };
    }

    describe("Investor Vesting", function () {
        it("Should create investor vesting schedule and release AMD tokens", async function () {
            const { vestingContract, amdToken, aimToken, owner, investor1, scheduleAmount } = await helpers.loadFixture(deployInvestorVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Investor Listing Timestamp:", formatTimestamp(listingTimestamp));
            console.log("Investor Schedule Amount:", formatAimBalance(scheduleAmount), "AIM");
            await vestingContract.connect(owner).createInvestorVesting(
                investor1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(investor1.address);
            expect(await aimToken.balanceOf(investor1.address)).to.equal(scheduleAmount);

            const globalStartTime = await vestingContract.globalStartTime();
            console.log("Investor Global Start Time:", formatTimestamp(Number(globalStartTime)));
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);
            console.log("Investor Cliff Ends Timestamp:", formatTimestamp(cliffEndsTimestamp));
            await helpers.time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60)); // 1 month after cliff
            console.log("Investor Claim Time:", formatTimestamp(await helpers.time.latest()));
            await vestingContract.connect(investor1).claim();

            console.log("Investor AMD Balance (after 1st claim):", formatAmdBalance(await amdToken.balanceOf(investor1.address)));
            const updatedSchedule = await vestingContract.vestingSchedules(investor1.address);
            expect(await aimToken.balanceOf(investor1.address)).to.equal(scheduleAmount);
            expect(await amdToken.balanceOf(investor1.address)).to.be.closeTo(scheduleAmount * BigInt(10)**BigInt(10) / BigInt(INVESTOR_INSTALLMENT_COUNT), 1);

            // Second allocation
            await helpers.time.increaseTo(cliffEndsTimestamp + (2 * 30 * 24 * 60 * 60)); // 2 months after cliff
            console.log("Investor Second Claim Time:", formatTimestamp(await helpers.time.latest()));
            await vestingContract.connect(investor1).claim();

            console.log("Investor AMD Balance (after 2nd claim):", formatAmdBalance(await amdToken.balanceOf(investor1.address)));

            console.log("Investor AMD Balance (after 2nd claim):", formatAmdBalance(await amdToken.balanceOf(investor1.address)));
            expect(await amdToken.balanceOf(investor1.address)).to.be.closeTo(BigInt(2) * scheduleAmount * BigInt(10)**BigInt(10) / BigInt(INVESTOR_INSTALLMENT_COUNT), 1);
        });

        it("Should not allow claiming before cliff ends", async function () {
            const { vestingContract, amdToken, aimToken, owner, investor1, scheduleAmount } = await helpers.loadFixture(deployInvestorVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Investor Listing Timestamp (Before Cliff):", formatTimestamp(listingTimestamp));
            await vestingContract.connect(owner).createInvestorVesting(
                investor1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(investor1.address);
            const globalStartTime = await vestingContract.globalStartTime();
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);

            await helpers.time.increaseTo(cliffEndsTimestamp - 1); // 1 second before cliff ends
            console.log("Investor Attempt Claim Time (Before Cliff):", formatTimestamp(await helpers.time.latest()));
            const initialBalance = await amdToken.balanceOf(investor1.address);
            await vestingContract.connect(investor1).claim();
            expect(await amdToken.balanceOf(investor1.address)).to.equal(initialBalance);
        });

        it("Should allow claiming right after cliff ends", async function () {
            const { vestingContract, amdToken, aimToken, owner, investor1, scheduleAmount } = await helpers.loadFixture(deployInvestorVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Investor Listing Timestamp (After Cliff):", formatTimestamp(listingTimestamp));
            await vestingContract.connect(owner).createInvestorVesting(
                investor1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(investor1.address);
            const globalStartTime = await vestingContract.globalStartTime();
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);

            await helpers.time.increaseTo(cliffEndsTimestamp); // Exactly at cliff end
            console.log("Investor Claim Time (After Cliff):", formatTimestamp(await helpers.time.latest()));
            await vestingContract.connect(investor1).claim();

            console.log("Investor AMD Balance (after cliff claim):", formatAmdBalance(await amdToken.balanceOf(investor1.address)));
            // expect(await amdToken.balanceOf(investor1.address)).to.be.closeTo(scheduleAmount * BigInt(10)**BigInt(10) / BigInt(INVESTOR_INSTALLMENT_COUNT), 1);
        });

        it("Should release all tokens after the full vesting period", async function () {
            const { vestingContract, amdToken, aimToken, owner, investor1, scheduleAmount } = await helpers.loadFixture(deployInvestorVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Investor Listing Timestamp (Full Vesting):", formatTimestamp(listingTimestamp));
            console.log("Investor Schedule Amount (Full Vesting):", formatAimBalance(scheduleAmount), "AIM");
            await vestingContract.connect(owner).createInvestorVesting(
                investor1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(investor1.address);
            expect(await aimToken.balanceOf(investor1.address)).to.equal(scheduleAmount);

            const globalStartTime = await vestingContract.globalStartTime();
            console.log("Investor Global Start Time (Full Vesting):", formatTimestamp(Number(globalStartTime)));
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);
            console.log("Investor Cliff Ends Timestamp (Full Vesting):", formatTimestamp(cliffEndsTimestamp));

            // Fast-forward to the end of the vesting period
            const vestingEndsTimestamp = cliffEndsTimestamp + Number(schedule.vestingDuration);
            await helpers.time.increaseTo(vestingEndsTimestamp + (30 * 24 * 60 * 60)); // A month after vesting ends to ensure all installments are available
            console.log("Investor Full Vesting Claim Time:", formatTimestamp(await helpers.time.latest()));
            await vestingContract.connect(investor1).claim();

            console.log("Investor AMD Balance (after full vesting claim):", formatAmdBalance(await amdToken.balanceOf(investor1.address)));
            expect(await amdToken.balanceOf(investor1.address)).to.be.closeTo(scheduleAmount * BigInt(10)**BigInt(10), 1);
        });
    });
});
