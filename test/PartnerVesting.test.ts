import { ethers } from "hardhat";
import { expect, assert } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Aimond, AimondToken, VestingVault } from "../typechain-types";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";

import { formatTimestamp, formatAmdBalance, formatAimBalance } from "./utils/time";

describe("Cliff Vesting Scenarios", function () {
    async function deployVestingFixture() {
        const [owner, beneficiary] = await ethers.getSigners();
        const amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        const aimToken = await ethers.deployContract("Aimond");
        const vestingContract = await ethers.deployContract("VestingVault", [owner.address, await aimToken.getAddress(), await amdToken.getAddress()]);
        
        const amdDecimals = await amdToken.decimals();
        const aimDecimals = await aimToken.decimals();

        // Transfer AIM to beneficiary
        const scheduleAmount = ethers.parseUnits("10000", 8);
        console.log("Schedule Amount:", formatAimBalance(scheduleAmount));
        await aimToken.connect(owner).transfer(beneficiary.address, scheduleAmount);

        // Transfer AMD to vesting contract
        const totalAmdForVesting = ethers.parseUnits("100000", 18); // Example total amount for vesting
        await amdToken.connect(owner).transfer(await vestingContract.getAddress(), totalAmdForVesting);

        return { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount, amdDecimals, aimDecimals };
    }

    it("Should not allow claiming before cliff ends", async function () {
        const { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        console.log("Partner Listing Timestamp:", formatTimestamp(Number(listingTimestamp)), `(${listingTimestamp})`);
        await vestingContract.connect(owner).createPartnerVesting(
            beneficiary.address
        );
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();
        console.log("Global Start Time:", formatTimestamp(Number(globalStartTime)), `(${globalStartTime})`);
        console.log("Schedule Cliff Duration:", schedule.cliffDuration.toString());
        const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);
        const twoSecBeforeCliffEnds = cliffEndsTimestamp - 2;
        console.log("2 Sec Before Cliff Ends Timestamp:", formatTimestamp(Number(twoSecBeforeCliffEnds)), `(${twoSecBeforeCliffEnds})`);

        const initialBalance = await amdToken.balanceOf(beneficiary.address);
        console.log("Partner AMD Initaial Balance:", formatAmdBalance(initialBalance));

        await helpers.time.increaseTo(twoSecBeforeCliffEnds);
        console.log("Current Block Timestamp (before claim):", formatTimestamp(Number(await helpers.time.latest())), `(${await helpers.time.latest()})`);
        
        const releasableAmount = await vestingContract.getCurrentlyReleasableAmount(beneficiary.address);
        expect(releasableAmount).to.equal(0);

        await vestingContract.connect(beneficiary).claim();
        console.log("Partner AMD Balance (Before Cliff Claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(initialBalance);
    });

    it("Should allow claiming right after cliff ends", async function () {
        const { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount, amdDecimals, aimDecimals } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        console.log("Partner Listing Timestamp:", formatTimestamp(Number(listingTimestamp)), `(${listingTimestamp})`);
        await vestingContract.connect(owner).createPartnerVesting(
            beneficiary.address
        );
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();
        console.log("Global Start Time:", formatTimestamp(Number(globalStartTime)), `(${globalStartTime})`);
        const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration) - 1;
        console.log("Cliff Ends Timestamp:", formatTimestamp(Number(cliffEndsTimestamp)), `(${cliffEndsTimestamp})`);

        await helpers.time.increaseTo(cliffEndsTimestamp); // one sec before cliff end
        console.log("Partner Claim Time (After Cliff):", formatTimestamp(await helpers.time.latest()), `(${await helpers.time.latest()})`);
        await vestingContract.connect(beneficiary).claim();

        const scaledScheduleAmount = scheduleAmount * BigInt(10) ** BigInt(amdDecimals - aimDecimals);
        console.log("Partner AMD Balance (after cliff claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(scaledScheduleAmount);
    });

    it("Should allow claiming one sec after cliff ends", async function () {
        const { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount, amdDecimals, aimDecimals } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        console.log("Partner Listing Timestamp:", formatTimestamp(Number(listingTimestamp)), `(${listingTimestamp})`);
        await vestingContract.connect(owner).createPartnerVesting(
            beneficiary.address
        );
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();
        console.log("Global Start Time:", formatTimestamp(Number(globalStartTime)), `(${globalStartTime})`);
        const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);
        console.log("Cliff Ends Timestamp:", formatTimestamp(Number(cliffEndsTimestamp)), `(${cliffEndsTimestamp})`);

        await helpers.time.increaseTo(cliffEndsTimestamp); // Exactly at cliff end
        console.log("Partner Claim Time (After Cliff):", formatTimestamp(await helpers.time.latest()), `(${await helpers.time.latest()})`);
        await vestingContract.connect(beneficiary).claim();

        const scaledScheduleAmount = scheduleAmount * BigInt(10) ** BigInt(amdDecimals - aimDecimals);
        console.log("Partner AMD Balance (after cliff claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(scaledScheduleAmount);
    });

    it("Should allow claiming all tokens after full vesting period", async function () {
        const { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount, amdDecimals, aimDecimals } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        await vestingContract.connect(owner).createPartnerVesting(
            beneficiary.address
        );
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();
        const fullVestingEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration) + Number(schedule.vestingDuration);
        
        console.log("Full Vesting Ends Timestamp:", formatTimestamp(Number(fullVestingEndsTimestamp)), `(${fullVestingEndsTimestamp})`);

        await helpers.time.increaseTo(fullVestingEndsTimestamp);
        console.log("Partner Claim Time (After Full Vesting):", formatTimestamp(await helpers.time.latest()), `(${await helpers.time.latest()})`);
        await vestingContract.connect(beneficiary).claim();

        const scaledScheduleAmount = scheduleAmount * BigInt(10) ** BigInt(amdDecimals - aimDecimals);
        console.log("Partner AMD Balance (after full vesting claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(scaledScheduleAmount);
    });

    it("Should release tokens correctly over each installment", async function () {
        const { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount, amdDecimals, aimDecimals } = await helpers.loadFixture(deployVestingFixture);

        await vestingContract.connect(owner).createPartnerVesting(beneficiary.address);
        await vestingContract.connect(owner).setGlobalStartTime(await helpers.time.latest());

        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();

        // Calculate the expected amount per installment in AIM decimals
        const expectedAimPerInstallment = BigInt(scheduleAmount) / BigInt(schedule.installmentCount);

        // Scale this expected amount to AMD decimals for comparison with amdToken.balanceOf
        const scaledExpectedAmdPerInstallment = expectedAimPerInstallment * (BigInt(10) ** BigInt(amdDecimals - aimDecimals));
        const scaledScheduleAmount = scheduleAmount * BigInt(10) ** BigInt(amdDecimals - aimDecimals);

        let totalClaimedAmd = BigInt(0);

        const installmentDuration = schedule.vestingDuration / schedule.installmentCount;

        const expectedAmount = scheduleAmount * BigInt(10) ** BigInt(10) / schedule.installmentCount;

        for (let i = 0; i < schedule.installmentCount; i++) {
            const newTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration) + Number(installmentDuration) * i - 1;
            console.log("New installment:", formatTimestamp(Number(newTimestamp)), `(${newTimestamp})`);
        
            await helpers.time.increaseTo(newTimestamp);
            await vestingContract.connect(beneficiary).claim();

            totalClaimedAmd += expectedAmount;
            console.log("Partner AMD Balance (after installment):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
            expect(await amdToken.balanceOf(beneficiary.address)).to.equal(totalClaimedAmd);
        }
    });
});
