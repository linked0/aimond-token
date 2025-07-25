import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AimondToken, TokenVesting } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Investor Vesting Policy", function () {
    it("Should handle the full investor vesting lifecycle correctly", async function () {
        const [owner, investor1] = await ethers.getSigners();

        const aimondTokenFactory = await ethers.getContractFactory("AimondToken");
        const aimondToken = await aimondTokenFactory.deploy();
        const tokenAddress = await aimondToken.getAddress();

        const tokenVestingFactory = await ethers.getContractFactory("TokenVesting");
        const tokenVesting = await tokenVestingFactory.deploy(tokenAddress, owner.address);
        const vestingAddress = await tokenVesting.getAddress();

        const INVESTOR_ALLOCATION = ethers.parseUnits("8000000000", 8); // 8 billion tokens
        await aimondToken.connect(owner).transfer(vestingAddress, INVESTOR_ALLOCATION);

        const listingTimestamp = await time.latest();
        const cliffDurationInDays = 365;
        const vestingDurationInMonths = 10;
        const installmentCount = 10;

        await tokenVesting.connect(owner).createVestingSchedule(
            investor1.address,
            INVESTOR_ALLOCATION,
            listingTimestamp,
            cliffDurationInDays,
            vestingDurationInMonths,
            installmentCount
        );

        // Check total vested amount
        const totalVested = await tokenVesting.getTotalVestedAmount(investor1.address);
        expect(totalVested).to.equal(INVESTOR_ALLOCATION);

        const cliffEndsTimestamp = listingTimestamp + (cliffDurationInDays * 24 * 60 * 60);
        const MONTH_IN_SECONDS = 30 * 24 * 60 * 60;

        // 1. Before cliff ends
        await time.increaseTo(cliffEndsTimestamp - 1);
        expect(await tokenVesting.getCurrentlyReleasableAmount(investor1.address)).to.equal(0);

        // 2. After 1st month post-cliff
        await time.increaseTo(cliffEndsTimestamp + MONTH_IN_SECONDS);
        let expectedReleasable = INVESTOR_ALLOCATION / 10n;
        expect(await tokenVesting.getCurrentlyReleasableAmount(investor1.address)).to.be.closeTo(expectedReleasable, 1);
        await tokenVesting.connect(investor1).releaseVestedTokens();
        expect(await aimondToken.balanceOf(investor1.address)).to.be.closeTo(expectedReleasable, 1);

        // 3. After 5th month post-cliff
        await time.increaseTo(cliffEndsTimestamp + (5 * MONTH_IN_SECONDS));
        expectedReleasable = (INVESTOR_ALLOCATION * 5n) / 10n;
        expect(await tokenVesting.getCurrentlyReleasableAmount(investor1.address)).to.be.closeTo(expectedReleasable - await aimondToken.balanceOf(investor1.address), 1);
        await tokenVesting.connect(investor1).releaseVestedTokens();
        expect(await aimondToken.balanceOf(investor1.address)).to.be.closeTo(expectedReleasable, 1);

        // 4. After all installments (10 months post-cliff)
        await time.increaseTo(cliffEndsTimestamp + (10 * MONTH_IN_SECONDS));
        expect(await tokenVesting.getCurrentlyReleasableAmount(investor1.address)).to.be.closeTo(INVESTOR_ALLOCATION - await aimondToken.balanceOf(investor1.address), 1);
        await tokenVesting.connect(investor1).releaseVestedTokens();
        expect(await aimondToken.balanceOf(investor1.address)).to.equal(INVESTOR_ALLOCATION);

        // 5. Try to release again after full vesting
        const finalBalance = await aimondToken.balanceOf(investor1.address);
        expect(await tokenVesting.getCurrentlyReleasableAmount(investor1.address)).to.equal(0);
        await tokenVesting.connect(investor1).releaseVestedTokens(); // Should release 0
        expect(await aimondToken.balanceOf(investor1.address)).to.equal(finalBalance);
    });
});
