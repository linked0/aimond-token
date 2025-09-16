import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AimondToken, MockVestingToken } from "../typechain-types";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";

describe("MockVestingToken Scenarios", function () {
    async function deployVestingFixture() {
        const [owner, beneficiary] = await ethers.getSigners();
        const amdToken = await ethers.deployContract("AimondToken", [owner.address]);
        const vestingContract = await ethers.deployContract("MockVestingToken", [owner.address, owner.address, await amdToken.getAddress(), 86400, 950400, 10]);

        const scheduleAmount = ethers.parseUnits("1000", 18);
        const totalAmdForVesting = ethers.parseUnits("10000", 18);
        await amdToken.connect(owner).approve(await vestingContract.getAddress(), totalAmdForVesting);

        return { vestingContract, amdToken, owner, beneficiary, scheduleAmount };
    }

    it("Should not allow claiming before cliff ends", async function () {
        const { vestingContract, amdToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        await vestingContract.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);

        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();
        const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);

        // IMPORTANT: There is a 1-second offset with `helpers.time.increaseTo`.
        // Calling `increaseTo(T)` results in the next block having a timestamp of `T + 1`.
        await helpers.time.increaseTo(cliffEndsTimestamp - 5); // 5 seconds before cliff ends

        const releasableAmount = await vestingContract.getCurrentlyReleasableAmount(beneficiary.address);
        expect(releasableAmount).to.equal(0);

        await vestingContract.connect(beneficiary).claim();
        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(0);
    });

    it("Should allow claiming right after cliff ends", async function () {
        const { vestingContract, amdToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        await vestingContract.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);

        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();
        const cliffEndsTimestamp = Number(globalStartTime) + Number(schedule.cliffDuration);

        await helpers.time.increaseTo(cliffEndsTimestamp);

        await vestingContract.connect(beneficiary).claim();
        // After 1 minute (cliff), 1/10th of the tokens should be released.
        expect(await amdToken.balanceOf(beneficiary.address)).to.be.closeTo(scheduleAmount / 10n, ethers.parseUnits("1", "gwei"));
    });

    it("Should release tokens correctly over each installment", async function () {
        const { vestingContract, amdToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        await vestingContract.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);

        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();
        const cliffDuration = Number(schedule.cliffDuration);
        const releaseDuration = Number(schedule.releaseDuration);
        const installmentCount = Number(schedule.installmentCount);
        const installmentDuration = releaseDuration / installmentCount;

        for (let i = 1; i <= installmentCount; i++) {
            const timeToIncrease = Number(globalStartTime) + cliffDuration + (installmentDuration * (i - 1));
            await helpers.time.increaseTo(timeToIncrease);
            await vestingContract.connect(beneficiary).claim();

            const expectedAmount = (scheduleAmount * BigInt(i)) / BigInt(installmentCount);
            expect(await amdToken.balanceOf(beneficiary.address)).to.be.closeTo(expectedAmount, ethers.parseUnits("1", "gwei"));
        }
    });

    it("Should allow claiming all tokens after full vesting period", async function () {
        const { vestingContract, amdToken, owner, beneficiary, scheduleAmount } = await helpers.loadFixture(deployVestingFixture);

        const listingTimestamp = await helpers.time.latest();
        await vestingContract.connect(owner).createVesting(beneficiary.address, scheduleAmount);
        await vestingContract.connect(owner).setGlobalStartTime(listingTimestamp);

        const schedule = await vestingContract.vestingSchedules(beneficiary.address);
        const globalStartTime = await vestingContract.globalStartTime();
        const vestingEndsTimestamp = Number(globalStartTime) + Number(schedule.totalVestingDuration);

        await helpers.time.increaseTo(vestingEndsTimestamp);

        await vestingContract.connect(beneficiary).claim();
        expect(await amdToken.balanceOf(beneficiary.address)).to.equal(scheduleAmount);
    });
});