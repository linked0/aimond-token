import { ethers } from "hardhat";

async function main() {
  const recipient = process.env.JAYMOND_RECIPIENT_ADDRESS;
  if (!recipient) {
    throw new Error("Please set your JAYMOND_RECIPIENT_ADDRESS in a .env file");
  }

  const aimondAddress = process.env.JAYMOND_ADDRESS;
  if(!aimondAddress) {
    throw new Error("Please set your JAYMOND_ADDRESS in a .env file");
  }

  const [signer] = await ethers.getSigners();

  const AimondToken = await ethers.getContractFactory("contracts/JaymondToken.sol:Jaymond");
  const aimondToken = AimondToken.attach(aimondAddress);

  const amount = ethers.parseUnits("80000000000", 8);

  console.log(`Transferring ${amount} JaymondToken to ${recipient}...`);

  const tx = await aimondToken.connect(signer).transfer(recipient, amount);
  await tx.wait();

  console.log("Transfer complete!");
  console.log(`Transaction hash: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
