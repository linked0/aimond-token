import { ethers } from "hardhat";

import type { Provider } from "ethers";

async function main() {
  const provider = ethers.provider;
  const admin = new ethers.Wallet(process.env.ADMIN_KEY || "", provider as unknown as Provider);
  console.log("admin address:", admin.address);

  const aimond = await ethers.deployContract("contracts/JaymondToken.sol:Jaymond");
  await aimond.waitForDeployment();
  console.log(`Deployed JaymondToken=${aimond.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
