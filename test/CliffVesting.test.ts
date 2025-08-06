import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Aimond, AimondToken, TokenVesting } from "../typechain-types";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";

import { formatTimestamp, formatAmdBalance, formatAimBalance } from "./utils/time";

describe("Cliff Vesting Scenarios", function () {
    async function deployVestingFixture() {
        const [owner, beneficiary] = await ethers.getSigners();
        const amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        const aimToken = await ethers.deployContract("Aimond");
        const vestingContract = await ethers.deployContract("TokenVesting", [owner.address, await aimToken.getAddress(), await amdToken.getAddress()]);

        
        
        // Transfer AIM to beneficiary
        const scheduleAmount = ethers.parseUnits("10000", 8);
        await aimToken.connect(owner).transfer(beneficiary.address, scheduleAmount);

        return { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount };
    }

    describe("Investor Vesting Cliff", function () {
        it("Should not allow claiming before cliff ends", async function () {
            const { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Investor Listing Timestamp:", formatTimestamp(listingTimestamp));
            await vestingContract.connect(owner).createInvestorVesting(
                beneficiary.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(beneficiary.address);
            const globalStartTime = await vestingContract.globalStartTime();
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);

            await helpers.time.increaseTo(cliffEndsTimestamp - 1); // 1 second before cliff ends
            console.log("Investor Attempt Claim Time (Before Cliff):", formatTimestamp(await helpers.time.latest()));
            const initialBalance = await amdToken.balanceOf(beneficiary.address);
            await vestingContract.connect(beneficiary).claim();
            expect(await amdToken.balanceOf(beneficiary.address)).to.equal(initialBalance);
            console.log("Investor AMD Balance (Before Cliff Claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
        });

        it("Should allow claiming right after cliff ends", async function () {
            const { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Investor Listing Timestamp:", formatTimestamp(listingTimestamp));
            await vestingContract.connect(owner).createInvestorVesting(
                beneficiary.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(beneficiary.address);
            const globalStartTime = await vestingContract.globalStartTime();
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);

            await helpers.time.increaseTo(cliffEndsTimestamp); // Exactly at cliff end
            console.log("Investor Claim Time (After Cliff):", formatTimestamp(await helpers.time.latest()));
            await vestingContract.connect(beneficiary).claim();

            console.log("Investor AMD Balance (after cliff claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
            expect(await amdToken.balanceOf(beneficiary.address)).to.be.greaterThan(0);
        });
    });

    describe("Founder Vesting Cliff", function () {
        it("Should not allow claiming before cliff ends", async function () {
            const { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Founder Listing Timestamp:", formatTimestamp(listingTimestamp));
            await vestingContract.connect(owner).createFounderVesting(
                beneficiary.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(beneficiary.address);
            const globalStartTime = await vestingContract.globalStartTime();
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);

            await helpers.time.increaseTo(cliffEndsTimestamp - 1); // 1 second before cliff ends
            console.log("Founder Attempt Claim Time (Before Cliff):", formatTimestamp(await helpers.time.latest()));
            const initialBalance = await amdToken.balanceOf(beneficiary.address);
            await vestingContract.connect(beneficiary).claim();
            expect(await amdToken.balanceOf(beneficiary.address)).to.equal(initialBalance);
            console.log("Founder AMD Balance (Before Cliff Claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
        });

        it("Should allow claiming right after cliff ends", async function () {
            const { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Founder Listing Timestamp:", formatTimestamp(listingTimestamp));
            await vestingContract.connect(owner).createFounderVesting(
                beneficiary.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(beneficiary.address);
            const globalStartTime = await vestingContract.globalStartTime();
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);

            await helpers.time.increaseTo(cliffEndsTimestamp); // Exactly at cliff end
            console.log("Founder Claim Time (After Cliff):", formatTimestamp(await helpers.time.latest()));
            await vestingContract.connect(beneficiary).claim();

            console.log("Founder AMD Balance (after cliff claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
            expect(await amdToken.balanceOf(beneficiary.address)).to.be.greaterThan(0);
        });
    });

    describe("Partner Vesting Cliff", function () {
        it("Should not allow claiming before cliff ends", async function () {
            const { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Partner Listing Timestamp:", formatTimestamp(listingTimestamp));
            await vestingContract.connect(owner).createPartnerVesting(
                beneficiary.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(beneficiary.address);
            const globalStartTime = await vestingContract.globalStartTime();
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);

            await helpers.time.increaseTo(cliffEndsTimestamp - 1); // 1 second before cliff ends
            console.log("Partner Attempt Claim Time (Before Cliff):", formatTimestamp(await helpers.time.latest()));
            const initialBalance = await amdToken.balanceOf(beneficiary.address);
            await vestingContract.connect(beneficiary).claim();
            expect(await amdToken.balanceOf(beneficiary.address)).to.equal(initialBalance);
            console.log("Partner AMD Balance (Before Cliff Claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
        });

        it("Should allow claiming right after cliff ends", async function () {
            const { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Partner Listing Timestamp:", formatTimestamp(listingTimestamp));
            await vestingContract.connect(owner).createPartnerVesting(
                beneficiary.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(beneficiary.address);
            const globalStartTime = await vestingContract.globalStartTime();
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);

            await helpers.time.increaseTo(cliffEndsTimestamp); // Exactly at cliff end
            console.log("Partner Claim Time (After Cliff):", formatTimestamp(await helpers.time.latest()));
            await vestingContract.connect(beneficiary).claim();

            console.log("Partner AMD Balance (after cliff claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
            expect(await amdToken.balanceOf(beneficiary.address)).to.be.greaterThan(0);
        });
    });
});
