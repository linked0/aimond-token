import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Aimond, AimondToken, TokenVesting } from "../typechain-types";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";

// Vesting schedule constants for testing (matching contract)
const PARTNER_CLIFF_DAYS = 960;
const PARTNER_VESTING_MONTHS = 0; // Single release after cliff
const PARTNER_INSTALLMENT_COUNT = 1; // Single release after cliff

import { formatTimestamp, formatAmdBalance, formatAimBalance } from "./utils/time";

describe("TokenVesting", function () {
    async function deployPartnerVestingFixture() {
        const [owner, partner1] = await ethers.getSigners();
        const amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        const aimToken = await ethers.deployContract("Aimond");
        const vestingContract = await ethers.deployContract("TokenVesting", [owner.address, await aimToken.getAddress(), await amdToken.getAddress()]);

        // Approve AMD to vesting contract
        await amdToken.connect(owner).approve(await vestingContract.getAddress(), ethers.parseUnits("5200000000", 18));

        // Transfer AIM to partner1
        const scheduleAmount = ethers.parseUnits("5000", 8);
        await aimToken.connect(owner).transfer(partner1.address, scheduleAmount);

        return { vestingContract, amdToken, aimToken, owner, partner1, scheduleAmount };
    }

    describe("Partner Vesting", function () {
        it("Should create partner vesting schedule and release AMD tokens", async function () {
            const { vestingContract, amdToken, aimToken, owner, partner1, scheduleAmount } = await helpers.loadFixture(deployPartnerVestingFixture);

            const listingTimestamp = await helpers.time.latest();
            console.log("Partner Listing Timestamp:", formatTimestamp(listingTimestamp));
            console.log("Partner Schedule Amount:", formatAimBalance(scheduleAmount), "AIM");
            await vestingContract.connect(owner).createPartnerVesting(
                partner1.address
            );
            await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
            
            const schedule = await vestingContract.vestingSchedules(partner1.address);
            expect(await aimToken.balanceOf(partner1.address)).to.equal(scheduleAmount);

            const globalStartTime = await vestingContract.globalStartTime();
            console.log("Partner Global Start Time:", formatTimestamp(Number(globalStartTime)));
            const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);
            console.log("Partner Cliff Ends Timestamp:", formatTimestamp(cliffEndsTimestamp));
            await helpers.time.increaseTo(cliffEndsTimestamp); // at cliff end
            console.log("Partner Claim Time:", formatTimestamp(await helpers.time.latest()));
            await vestingContract.connect(partner1).claim();

            console.log("Partner AMD Balance (after claim):", formatAmdBalance(await amdToken.balanceOf(partner1.address)));

            console.log("Partner AMD Balance (after claim):", formatAmdBalance(await amdToken.balanceOf(partner1.address)));

            const updatedSchedule = await vestingContract.vestingSchedules(partner1.address);
            expect(await aimToken.balanceOf(partner1.address)).to.equal(scheduleAmount);
            expect(await amdToken.balanceOf(partner1.address)).to.equal(scheduleAmount * BigInt(10)**BigInt(10));
        });
    });
});
