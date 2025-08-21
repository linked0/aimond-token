import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AimondToken, EmployeeVestingToken } from "../typechain-types";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";

import { formatTimestamp, formatAmdBalance, formatAimBalance } from "./utils/time";

import { TOTAL_VESTING_AMOUNT_EMPLOYEE } from "./constants";

describe("EmployeeVestingToken Scenarios", function () {
    async function deployVestingFixture() {
        const [owner, beneficiary] = await ethers.getSigners();
        const amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        const vestingContract = await ethers.deployContract("EmployeeVestingToken", [owner.address, owner.address, await amdToken.getAddress()]);
        
        const amdDecimals = await amdToken.decimals();

        // Transfer VestingToken to beneficiary
        const scheduleAmount = ethers.parseUnits("10000", 18);
        await vestingContract.connect(owner).transfer(beneficiary.address, scheduleAmount);

        // Transfer AMD to vesting contract
        const totalAmdForVesting = TOTAL_VESTING_AMOUNT_EMPLOYEE; // Total amount for vesting
        await amdToken.connect(owner).transfer(await vestingContract.getAddress(), totalAmdForVesting);

        return { vestingContract, amdToken, owner, beneficiary, scheduleAmount, amdDecimals };
    }

    it("Should not allow claiming before cliff ends", async function () {
        const { vestingContract, amdToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        await vestingContract.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();
        const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);
        const twoSecBeforeCliffEnds = cliffEndsTimestamp - 2;

        const initialBalance = await amdToken.balanceOf(beneficiary.address);

        // IMPORTANT: There is a 1-second offset with `helpers.time.increaseTo`.
        // Calling `increaseTo(T)` results in the next block having a timestamp of `T + 1`.
        await helpers.time.increaseTo(twoSecBeforeCliffEnds);
        
        const releasableAmount = await vestingContract.getCurrentlyReleasableAmount(beneficiary.address);
        expect(releasableAmount).to.equal(0);

        await vestingContract.connect(owner).releaseTo(beneficiary.address);
        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(initialBalance);
    });

    it("Should allow claiming right after cliff ends", async function () {
        const { vestingContract, amdToken, owner, beneficiary, scheduleAmount, amdDecimals } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        await vestingContract.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();
        const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration) - 1;

        await helpers.time.increaseTo(cliffEndsTimestamp); // one sec before cliff end
        await vestingContract.connect(owner).releaseTo(beneficiary.address);

        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(scheduleAmount);
    });

    it("Should allow claiming one sec after cliff ends", async function () {
        const { vestingContract, amdToken, owner, beneficiary, scheduleAmount, amdDecimals } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        await vestingContract.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();
        const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);

        await helpers.time.increaseTo(cliffEndsTimestamp); // Exactly at cliff end
        await vestingContract.connect(owner).releaseTo(beneficiary.address);

        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(scheduleAmount);
    });

    it("Should allow claiming all tokens after full vesting period", async function () {
        const { vestingContract, amdToken, owner, beneficiary, scheduleAmount, amdDecimals } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        await vestingContract.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);
        
        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();
        const fullVestingEndsTimestamp = Number(globalStartTime) + Number(schedule.totalVestingDuration);
        

        await helpers.time.increaseTo(fullVestingEndsTimestamp);
        await vestingContract.connect(owner).releaseTo(beneficiary.address);

        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(scheduleAmount);
    });

    it("Should release tokens correctly over each installment", async function () {
        const { vestingContract, amdToken, owner, beneficiary, scheduleAmount, amdDecimals } = await helpers.loadFixture(deployVestingFixture);

        await vestingContract.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(await helpers.time.latest());

        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();

        let totalClaimedAmd = BigInt(0);

        const installmentDuration = schedule.releaseDuration / schedule.installmentCount;

        const expectedAmount = scheduleAmount / schedule.installmentCount;

        for (let i = 0; i < schedule.installmentCount; i++) {
            const newTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration) + Number(installmentDuration) * i - 1;
        
            await helpers.time.increaseTo(newTimestamp);
            await vestingContract.connect(owner).releaseTo(beneficiary.address);

            totalClaimedAmd += expectedAmount;
            expect(await amdToken.balanceOf(beneficiary.address)).to.equal(totalClaimedAmd);
        }
    });

    it("Should release tokens for multiple beneficiaries via batch", async function () {
        const [owner, beneficiary1, beneficiary2] = await ethers.getSigners();
        const amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        const vestingContract = await ethers.deployContract(
            "EmployeeVestingToken",
            [owner.address, owner.address, await amdToken.getAddress()]
        );

        const scheduleAmount1 = ethers.parseUnits("10000", 18);
        const scheduleAmount2 = ethers.parseUnits("20000", 18);
        await vestingContract.connect(owner).transfer(beneficiary1.address, scheduleAmount1);
        await vestingContract.connect(owner).transfer(beneficiary2.address, scheduleAmount2);
        const totalAmdForVesting = TOTAL_VESTING_AMOUNT_EMPLOYEE;
        await amdToken
            .connect(owner)
            .transfer(await vestingContract.getAddress(), totalAmdForVesting);

        const listingTimestamp = await helpers.time.latest();
        await vestingContract
            .connect(owner)
            .createVesting(beneficiary1.address, scheduleAmount1);
        await vestingContract
            .connect(owner)
            .createVesting(beneficiary2.address, scheduleAmount2);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);

        const schedule = await vestingContract.vestingSchedules(
            beneficiary1.address
        );
        const globalStartTime = await vestingContract.globalStartTime();
        const fullVestingEndsTimestamp =
            Number(globalStartTime) +
            Number(schedule.totalVestingDuration);

        await helpers.time.increaseTo(fullVestingEndsTimestamp);
        await vestingContract
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