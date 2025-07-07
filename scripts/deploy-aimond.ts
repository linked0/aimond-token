import { ethers } from "hardhat";

import type { Provider } from "ethers";

async function main() {
  const provider = ethers.provider;
  const admin = new ethers.Wallet(process.env.ADMIN_KEY || "", provider as unknown as Provider);
  console.log("admin(deployer) address:", admin.address);

  const aimond = await ethers.deployContract("contracts/AimondToken.sol:Aimond");
  await aimond.waitForDeployment();
  console.log(`Deployed AimondToken=${aimond.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
