import { ethers } from "hardhat";

async function main() {
  const recipient = process.env.RECIPIENT_ADDRESS;
  if (!recipient) {
    throw new Error("Please set your RECIPIENT_ADDRESS in a .env file");
  }

  const aimondAddress = process.env.AIMOND_ADDRESS;
  if(!aimondAddress) {
    throw new Error("Please set your AIMOND_ADDRESS in a .env file");
  }

  const [signer] = await ethers.getSigners();

  const AimondToken = await ethers.getContractFactory("contracts/AimondToken.sol:Aimond");
  const aimondToken = AimondToken.attach(aimondAddress);

  const amount = ethers.parseUnits("80000000000", 8);

  console.log(`Transferring ${amount} AimondToken to ${recipient}...`);

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
