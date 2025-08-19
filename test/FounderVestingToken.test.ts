import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AimondToken, FounderVestingToken } from "../typechain-types";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";

import { formatTimestamp, formatAmdBalance, formatAimBalance } from "./utils/time";

describe("FounderVestingToken Scenarios", function () {
    async function deployVestingFixture() {
        const [owner, beneficiary] = await ethers.getSigners();
        const amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        const vestingToken = await ethers.deployContract("FounderVestingToken", [owner.address, owner.address, await amdToken.getAddress()]);
        
        const amdDecimals = await amdToken.decimals();

        // Transfer VestingToken to beneficiary
        const scheduleAmount = ethers.parseUnits("10000", 18);
        console.log("Schedule Amount:", formatAimBalance(scheduleAmount));
        await vestingToken.connect(owner).transfer(beneficiary.address, scheduleAmount);

        // Transfer AMD to vesting contract
        const totalAmdForVesting = ethers.parseUnits("100000", 18); // Example total amount for vesting
        await amdToken.connect(owner).transfer(await vestingToken.getAddress(), totalAmdForVesting);

        return { vestingToken, amdToken, owner, beneficiary, scheduleAmount, amdDecimals };
    }

    it("Should not allow claiming before cliff ends", async function () {
        const { vestingToken, amdToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        console.log("Founder Listing Timestamp:", formatTimestamp(Number(listingTimestamp)), `(${listingTimestamp})`);
        await vestingToken.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingToken.connect(owner).setGlobalStartTime(listingTimestamp);
        
        const schedule = await vestingToken.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingToken.globalStartTime();
        console.log("Global Start Time:", formatTimestamp(Number(globalStartTime)), `(${globalStartTime})`);
        console.log("Schedule Cliff Duration:", schedule.cliffDuration.toString());
        const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);
        const twoSecBeforeCliffEnds = cliffEndsTimestamp - 2;
        console.log("2 Sec Before Cliff Ends Timestamp:", formatTimestamp(Number(twoSecBeforeCliffEnds)), `(${twoSecBeforeCliffEnds})`);

        const initialBalance = await amdToken.balanceOf(beneficiary.address);
        console.log("Founder AMD Initaial Balance:", formatAmdBalance(initialBalance));

        await helpers.time.increaseTo(twoSecBeforeCliffEnds);
        console.log("Current Block Timestamp (before claim):", formatTimestamp(Number(await helpers.time.latest())), `(${await helpers.time.latest()})`);
        
        const releasableAmount = await vestingToken.getCurrentlyReleasableAmount(beneficiary.address);
        expect(releasableAmount).to.equal(0);

        await vestingToken.connect(owner).releaseTo(beneficiary.address);
        console.log("Founder AMD Balance (Before Cliff Claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(initialBalance);
    });

    it("Should allow claiming right after cliff ends", async function () {
        const { vestingToken, amdToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        console.log("Founder Listing Timestamp:", formatTimestamp(Number(listingTimestamp)), `(${listingTimestamp})`);
        await vestingToken.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingToken.connect(owner).setGlobalStartTime(listingTimestamp);
        
        const schedule = await vestingToken.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingToken.globalStartTime();
        console.log("Global Start Time:", formatTimestamp(Number(globalStartTime)), `(${globalStartTime})`);
        const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration) - 1;
        console.log("Cliff Ends Timestamp:", formatTimestamp(Number(cliffEndsTimestamp)), `(${cliffEndsTimestamp})`);

        await helpers.time.increaseTo(cliffEndsTimestamp); // one sec before cliff end
        console.log("Founder Claim Time (After Cliff):", formatTimestamp(await helpers.time.latest()), `(${await helpers.time.latest()})`);
        await vestingToken.connect(owner).releaseTo(beneficiary.address);

        const expectedAmount = scheduleAmount / schedule.installmentCount;
        console.log("Founder AMD Balance (after cliff claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(expectedAmount);
    });

    it("Should allow claiming one sec after cliff ends", async function () {
        const { vestingToken, amdToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        console.log("Founder Listing Timestamp:", formatTimestamp(Number(listingTimestamp)), `(${listingTimestamp})`);
        await vestingToken.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingToken.connect(owner).setGlobalStartTime(listingTimestamp);
        
        const schedule = await vestingToken.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingToken.globalStartTime();
        console.log("Global Start Time:", formatTimestamp(Number(globalStartTime)), `(${globalStartTime})`);
        const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);
        console.log("Cliff Ends Timestamp:", formatTimestamp(Number(cliffEndsTimestamp)), `(${cliffEndsTimestamp})`);

        await helpers.time.increaseTo(cliffEndsTimestamp); // Exactly at cliff end
        console.log("Founder Claim Time (After Cliff):", formatTimestamp(await helpers.time.latest()), `(${await helpers.time.latest()})`);
        await vestingToken.connect(owner).releaseTo(beneficiary.address);

        const expectedAmount = scheduleAmount / schedule.installmentCount;
        console.log("Founder AMD Balance (after cliff claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(expectedAmount);
    });

    it("Should allow claiming all tokens after full vesting period", async function () {
        const { vestingToken, amdToken, owner, beneficiary, scheduleAmount, amdDecimals } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        await vestingToken.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingToken.connect(owner).setGlobalStartTime(listingTimestamp);
        
        const schedule = await vestingToken.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingToken.globalStartTime();
        const fullVestingEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration) + Number(schedule.releaseDuration);
        
        console.log("Full Vesting Ends Timestamp:", formatTimestamp(Number(fullVestingEndsTimestamp)), `(${fullVestingEndsTimestamp})`);

        await helpers.time.increaseTo(fullVestingEndsTimestamp);
        console.log("Founder Claim Time (After Full Vesting):", formatTimestamp(await helpers.time.latest()), `(${await helpers.time.latest()})`);
        await vestingToken.connect(owner).releaseTo(beneficiary.address);

        console.log("Founder AMD Balance (after full vesting claim):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(scheduleAmount);
    });

    it("Should release tokens correctly over each installment", async function () {
        const { vestingToken, amdToken, owner, beneficiary, scheduleAmount, amdDecimals } = await helpers.loadFixture(deployVestingFixture);

        await vestingToken.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingToken.connect(owner).setGlobalStartTime(await helpers.time.latest());

        const schedule = await vestingToken.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingToken.globalStartTime();

        let totalClaimedAmd = BigInt(0);

        const installmentDuration = schedule.releaseDuration / schedule.installmentCount;

        const expectedAmount = scheduleAmount / schedule.installmentCount;

        for (let i = 0; i < schedule.installmentCount; i++) {
            const newTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration) + Number(installmentDuration) * i - 1;
            console.log("New installment:", formatTimestamp(Number(newTimestamp)), `(${newTimestamp})`);
        
            await helpers.time.increaseTo(newTimestamp);
            await vestingToken.connect(owner).releaseTo(beneficiary.address);

            totalClaimedAmd += expectedAmount;
            console.log("Founder AMD Balance (after installment):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
            expect(await amdToken.balanceOf(beneficiary.address)).to.equal(totalClaimedAmd);
        }
    });

    it("Should release tokens for multiple beneficiaries via batch", async function () {
        const [owner, beneficiary1, beneficiary2] = await ethers.getSigners();
        const amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        const vestingToken = await ethers.deployContract(
            "FounderVestingToken",
            [owner.address, owner.address, await amdToken.getAddress()]
        );

        const scheduleAmount1 = ethers.parseUnits("10000", 18);
        const scheduleAmount2 = ethers.parseUnits("20000", 18);
        await vestingToken.connect(owner).transfer(beneficiary1.address, scheduleAmount1);
        await vestingToken.connect(owner).transfer(beneficiary2.address, scheduleAmount2);
        const totalAmdForVesting = ethers.parseUnits("100000", 18);
        await amdToken
            .connect(owner)
            .transfer(await vestingToken.getAddress(), totalAmdForVesting);

        const listingTimestamp = await helpers.time.latest();
        await vestingToken
            .connect(owner)
            .createVesting(beneficiary1.address, scheduleAmount1);
        await vestingToken
            .connect(owner)
            .createVesting(beneficiary2.address, scheduleAmount2);
        await vestingToken.connect(owner).setGlobalStartTime(listingTimestamp);

        const schedule = await vestingToken.vestingSchedules(
            beneficiary1.address
        );
        const globalStartTime = await vestingToken.globalStartTime();
        const fullVestingEndsTimestamp =
            Number(globalStartTime) +
            Number(schedule.cliffDuration) +
            Number(schedule.releaseDuration);

        await helpers.time.increaseTo(fullVestingEndsTimestamp);
        await vestingToken
            .connect(owner)
            .releaseToBatch([beneficiary1.address, beneficiary2.address]);

        expect(await amdToken.balanceOf(beneficiary1.address)).to.equal(
            scheduleAmount1
        );
        expect(await amdToken.balanceOf(beneficiary2.address)).to.equal(
            scheduleAmount2
        );
    });
});
