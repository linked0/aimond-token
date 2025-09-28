import { ethers } from "ethers";
import * as fs from "fs";
import "dotenv/config";

async function main() {
  const privateKey = process.argv[2];
  if (!privateKey) {
    throw new Error("Required arguments missing. Please check documentation for usage.");
  }

  const password = process.argv[3];
  if (!password) {
    throw new Error("Required arguments missing. Please check documentation for usage.");
  }

  const wallet = new ethers.Wallet(privateKey);
  console.log(`Address: ${wallet.address}`);

  const keystore = await wallet.encrypt(password);

  const fileName = "keystore-loyalty-point-admin.json";
  fs.writeFileSync(fileName, keystore);

  console.log(`Keystore file created: ${fileName}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
