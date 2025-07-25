import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AimondToken, TokenVesting } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Employee/Partner Vesting Policy", function () {
    it("Should follow a 32-month cliff with a single release", async function () {
        const [owner, employee] = await ethers.getSigners();
        const aimondTokenFactory = await ethers.getContractFactory("AimondToken");
        const aimondToken = await aimondTokenFactory.deploy();
        const tokenAddress = await aimondToken.getAddress();

        const tokenVestingFactory = await ethers.getContractFactory("TokenVesting");
        const tokenVesting = await tokenVestingFactory.deploy(tokenAddress, owner.address);
        const vestingAddress = await tokenVesting.getAddress();

        const VESTING_AMOUNT = ethers.parseUnits("5200000000", 8);
        await aimondToken.transfer(vestingAddress, VESTING_AMOUNT);

        const listingTimestamp = await time.latest();
        const cliffDurationInMonths = 32;

        await tokenVesting.connect(owner).createVestingSchedule(
            employee.address,
            VESTING_AMOUNT,
            listingTimestamp,
            cliffDurationInMonths * 30, // Cliff in days
            1, // Vesting duration in months (single release)
            1  // Single installment
        );

        const cliffEndsTimestamp = listingTimestamp + (cliffDurationInMonths * 30 * 24 * 60 * 60);

        // 1. Before cliff ends
        await time.increaseTo(cliffEndsTimestamp - 1);
        expect(await tokenVesting.getCurrentlyReleasableAmount(employee.address)).to.equal(0);

        // 2. After cliff and vesting period ends
        await time.increaseTo(cliffEndsTimestamp + (30 * 24 * 60 * 60)); // Increase time by 1 month
        expect(await tokenVesting.getCurrentlyReleasableAmount(employee.address)).to.equal(VESTING_AMOUNT);
        await tokenVesting.connect(employee).releaseVestedTokens();
        expect(await aimondToken.balanceOf(employee.address)).to.equal(VESTING_AMOUNT);
    });
});
