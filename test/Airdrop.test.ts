import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AimondToken, Airdrop } from "../typechain-types";

describe("Airdrop Contract", function () {
    let aimondToken: AimondToken;
    let airdropContract: Airdrop;
    let owner: SignerWithAddress;
    let recipient1: SignerWithAddress;
    let recipient2: SignerWithAddress;
    let nonOwner: SignerWithAddress;

    const TOTAL_AIRDROP_ALLOCATION = ethers.parseUnits("500000000", 18); // 500 million tokens as per PDF

    beforeEach(async function () {
        [owner, recipient1, recipient2, nonOwner] = await ethers.getSigners();

        // Deploy AimondToken
        aimondToken = await ethers.deployContract("AimondToken", [owner.address]);
        const aimondTokenAddress = await aimondToken.getAddress();

        // Deploy Airdrop contract
        airdropContract = await ethers.deployContract("Airdrop", [aimondTokenAddress, owner.address, TOTAL_AIRDROP_ALLOCATION]);
        const airdropContractAddress = await airdropContract.getAddress();

        // Fund the Airdrop contract with the total allocation
        await aimondToken.connect(owner).transfer(airdropContractAddress, TOTAL_AIRDROP_ALLOCATION);
        expect(await aimondToken.balanceOf(airdropContractAddress)).to.equal(TOTAL_AIRDROP_ALLOCATION);
    });

    it("Should allow owner to airdrop tokens to a recipient", async function () {
        const airdropAmount = ethers.parseUnits("1000", 18);
        
        await expect(airdropContract.connect(owner).airdropTokens(recipient1.address, airdropAmount))
            .to.emit(airdropContract, "TokensAirdropped")
            .withArgs(recipient1.address, airdropAmount);

        expect(await aimondToken.balanceOf(recipient1.address)).to.equal(airdropAmount);
        expect(await airdropContract.distributedAmount()).to.equal(airdropAmount);
        expect(await aimondToken.balanceOf(await airdropContract.getAddress())).to.equal(TOTAL_AIRDROP_ALLOCATION - airdropAmount);
    });

    it("Should not allow a non-owner to airdrop tokens", async function () {
        const airdropAmount = ethers.parseUnits("100", 18);
        await expect(airdropContract.connect(nonOwner).airdropTokens(recipient1.address, airdropAmount))
            .to.be.revertedWithCustomError(airdropContract, "OwnableUnauthorizedAccount");
    });

    it("Should not allow airdropping more than the total allocation", async function () {
        const excessiveAmount = TOTAL_AIRDROP_ALLOCATION + ethers.parseUnits("1", 18);
        await expect(airdropContract.connect(owner).airdropTokens(recipient1.address, excessiveAmount))
            .to.be.revertedWith("Exceeds total airdrop allocation");
    });

    it("Should not allow airdropping if contract balance is insufficient", async function () {
        // Deploy a new Airdrop contract with a specific total allocation
        const LIMITED_ALLOCATION = ethers.parseUnits("10000", 18); // A smaller allocation for this test
        const limitedAirdropContract = await ethers.deployContract("Airdrop", [await aimondToken.getAddress(), owner.address, LIMITED_ALLOCATION]);

        // Fund the contract with less than its total allocation
        const fundedAmount = ethers.parseUnits("5000", 18);
        await aimondToken.connect(owner).transfer(await limitedAirdropContract.getAddress(), fundedAmount);
        expect(await aimondToken.balanceOf(await limitedAirdropContract.getAddress())).to.equal(fundedAmount);

        // Try to airdrop an amount that is within the total allocation but exceeds the contract's current balance
        const airdropAmount = ethers.parseUnits("6000", 18); // > fundedAmount, < LIMITED_ALLOCATION
        await expect(limitedAirdropContract.connect(owner).airdropTokens(recipient1.address, airdropAmount))
            .to.be.revertedWith("Insufficient tokens in contract");
    });

    it("Should allow owner to recover accidentally sent ERC20 tokens", async function () {
        // Deploy a dummy ERC20 token
        const DummyTokenFactory = await ethers.getContractFactory("AimondToken"); // Using AimondToken as a dummy
        const dummyToken = await DummyTokenFactory.deploy(owner.address);
        const dummyTokenAddress = await dummyToken.getAddress();

        // Get initial balance of dummy tokens for the owner AFTER deployment
        const initialOwnerDummyBalance = await dummyToken.balanceOf(owner.address);

        // Send dummy tokens to the Airdrop contract
        const dummyAmount = ethers.parseUnits("500", 18); // Match AimondToken's 8 decimals
        await dummyToken.connect(owner).transfer(await airdropContract.getAddress(), dummyAmount);
        expect(await dummyToken.balanceOf(await airdropContract.getAddress())).to.equal(dummyAmount);

        // Recover dummy tokens
        await expect(airdropContract.connect(owner).recoverERC20(dummyTokenAddress, dummyAmount))
            .to.emit(dummyToken, "Transfer")
            .withArgs(await airdropContract.getAddress(), owner.address, dummyAmount);

        // Assert that owner's balance is initial + recovered amount
        expect(await dummyToken.balanceOf(owner.address)).to.equal(initialOwnerDummyBalance);
        expect(await dummyToken.balanceOf(await airdropContract.getAddress())).to.equal(0);
    });

    it("Should not allow recovering the main AimondToken via recoverERC20", async function () {
        const airdropContractAddress = await airdropContract.getAddress();
        // Attempt to recover AimondToken
        await expect(airdropContract.connect(owner).recoverERC20(await aimondToken.getAddress(), ethers.parseUnits("1", 18)))
            .to.be.revertedWith("Cannot recover main token via this function");
    });
});
