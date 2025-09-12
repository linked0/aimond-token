import { ethers } from "ethers";
import * as fs from "fs";
import "dotenv/config";

async function main() {
  const privateKey = process.env.LOYALTY_POINT_ADMIN_KEY;
  if (!privateKey) {
    throw new Error("LOYALTY_POINT_ADMIN_KEY not found in .env file");
  }

  const password = process.env.LOYALTY_POINT_ADMIN_PASSWORD;
  if (!password) {
    throw new Error("LOYALTY_POINT_ADMIN_PASSWORD not found in .env file");
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
