import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AimondToken, TokenVesting } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Founder Vesting Policy", function () {
    it("Should follow a 22-month cliff and 10 monthly installments", async function () {
        const [owner, founder] = await ethers.getSigners();
        const aimondTokenFactory = await ethers.getContractFactory("AimondToken");
        const aimondToken = await aimondTokenFactory.deploy();
        const tokenAddress = await aimondToken.getAddress();

        const tokenVestingFactory = await ethers.getContractFactory("TokenVesting");
        const tokenVesting = await tokenVestingFactory.deploy(tokenAddress, owner.address);
        const vestingAddress = await tokenVesting.getAddress();

        const VESTING_AMOUNT = ethers.parseUnits("20000000000", 8);
        await aimondToken.transfer(vestingAddress, VESTING_AMOUNT);

        const listingTimestamp = await time.latest();
        const cliffDurationInMonths = 22;
        const vestingDurationInMonths = 10;
        const installmentCount = 10;

        await tokenVesting.connect(owner).createVestingSchedule(
            founder.address,
            VESTING_AMOUNT,
            listingTimestamp,
            cliffDurationInMonths * 30, // Cliff in days
            vestingDurationInMonths,
            installmentCount
        );

        const cliffEndsTimestamp = listingTimestamp + (cliffDurationInMonths * 30 * 24 * 60 * 60);
        const MONTH_IN_SECONDS = 30 * 24 * 60 * 60;

        // 1. Before cliff ends
        await time.increaseTo(cliffEndsTimestamp - 1);
        expect(await tokenVesting.getCurrentlyReleasableAmount(founder.address)).to.equal(0);

        // 2. After 1st month post-cliff
        await time.increaseTo(cliffEndsTimestamp + MONTH_IN_SECONDS);
        let expectedReleasable = VESTING_AMOUNT / 10n;
        expect(await tokenVesting.getCurrentlyReleasableAmount(founder.address)).to.be.closeTo(expectedReleasable, 1);
        await tokenVesting.connect(founder).releaseVestedTokens();
        expect(await aimondToken.balanceOf(founder.address)).to.be.closeTo(expectedReleasable, 1);

        // 3. After all installments (10 months post-cliff)
        await time.increaseTo(cliffEndsTimestamp + (10 * MONTH_IN_SECONDS));
        await tokenVesting.connect(founder).releaseVestedTokens();
        expect(await aimondToken.balanceOf(founder.address)).to.equal(VESTING_AMOUNT);
    });
});
