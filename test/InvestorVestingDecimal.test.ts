import { ethers } from "hardhat";
import { expect, assert } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Aimond, AimondToken, VestingVault } from "../typechain-types";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";

import { formatTimestamp, formatAmdBalance, formatAimBalance } from "./utils/time";

describe("Investor Vesting Decimal Scenarios", function () {
    async function deployVestingFixture() {
        const [owner, beneficiary] = await ethers.getSigners();
        const amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        const aimToken = await ethers.deployContract("Aimond");
        const vestingContract = await ethers.deployContract("VestingVault", [owner.address, await aimToken.getAddress(), await amdToken.getAddress()]);
        
        const amdDecimals = await amdToken.decimals();
        const aimDecimals = await aimToken.decimals();

        // Transfer AIM to beneficiary
        const scheduleAmount = ethers.parseUnits("10001.12345678", 8);
        console.log("Schedule Amount:", formatAimBalance(scheduleAmount));
        await aimToken.connect(owner).transfer(beneficiary.address, scheduleAmount);

        // Transfer AMD to vesting contract
        const totalAmdForVesting = ethers.parseUnits("100000", 18); // Example total amount for vesting
        await amdToken.connect(owner).transfer(await vestingContract.getAddress(), totalAmdForVesting);

        return { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount, amdDecimals, aimDecimals };
    }

    it("Should release tokens correctly over each installment", async function () {
        const { vestingContract, amdToken, aimToken, owner, beneficiary, scheduleAmount, amdDecimals, aimDecimals } = await helpers.loadFixture(deployVestingFixture);

        await vestingContract.connect(owner).createInvestorVesting(beneficiary.address);
        await vestingContract.connect(owner).setGlobalStartTime(await helpers.time.latest());

        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();

        // Calculate the expected amount per installment in AIM decimals
        const expectedAimPerInstallment = BigInt(scheduleAmount) / BigInt(schedule.installmentCount);

        // Scale this expected amount to AMD decimals for comparison with amdToken.balanceOf
        const scaledExpectedAmdPerInstallment = expectedAimPerInstallment * (BigInt(10) ** BigInt(amdDecimals - aimDecimals));
        const scaledScheduleAmount = scheduleAmount * BigInt(10) ** BigInt(amdDecimals - aimDecimals);
        const delta = BigInt(10) ** BigInt(amdDecimals - BigInt(1)); // 0.1 in AMD decimals

        let totalClaimedAmd = BigInt(0);

        const installmentDuration = schedule.vestingDuration / schedule.installmentCount;

        const expectedAmount = scheduleAmount * BigInt(10) ** BigInt(10) / schedule.installmentCount;

        for (let i = 0; i < schedule.installmentCount; i++) {
            const newTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration) + Number(installmentDuration) * i - 1;
            console.log("New installment:", formatTimestamp(Number(newTimestamp)), `(${newTimestamp})`);
        
            await helpers.time.increaseTo(newTimestamp);
            await vestingContract.connect(beneficiary).claim();

            totalClaimedAmd += scaledExpectedAmdPerInstallment;
            console.log("Investor AMD Balance (after installment):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
            expect(await amdToken.balanceOf(beneficiary.address)).to.be.closeTo(totalClaimedAmd, delta);
        }

        // Test scheduled total amount
        console.log("Scaled Total Amount:", formatAmdBalance(scaledScheduleAmount));
        const beneficiaryBalance = await amdToken.balanceOf(beneficiary.address);
        console.log("Investor AMD Balance (after vesting period):", formatAmdBalance(await amdToken.balanceOf(beneficiary.address)));
        expect(beneficiaryBalance).to.equal(scaledScheduleAmount);
    });
});
