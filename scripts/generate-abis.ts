
import fs from 'fs';
import path from 'path';

const getAbi = (contractName: string) => {
  try {
    const dir = path.resolve(
      __dirname,
      `../artifacts/contracts/${contractName}.sol`,
    );
    const file = fs.readFileSync(`${dir}/${contractName}.json`, 'utf8');
    const json = JSON.parse(file);
    return json.abi;
  } catch (e) {
    console.error('Failed to load ABI for contract:', contractName, e)
  }
};

const getMockAbi = (contractName: string) => {
    try {
      const dir = path.resolve(
        __dirname,
        `../artifacts/contracts/mocks/${contractName}.sol`,
      );
      const file = fs.readFileSync(`${dir}/${contractName}.json`, 'utf8');
      const json = JSON.parse(file);
      return json.abi;
    } catch (e) {
      console.error('Failed to load mock ABI for contract:', contractName, e);
    }
  };

const loyaltyPointABI = getAbi('LoyaltyPoint');
const employeeVestingABI = getAbi('EmployeeVestingToken');
const founderVestingABI = getAbi('FounderVestingToken');
const investorVestingABI = getAbi('InvestorVestingToken');
const mockVestingABI = getMockAbi('MockVestingToken');

const content = `export const loyaltyPointAddress = process.env.REACT_APP_LOYALTY_POINT_ADDRESS || "0x...DEFAULT_CONTRACT_ADDRESS_HERE"; // TODO: Replace with your contract address or provide a default
export const employeeVestingAddress = process.env.REACT_APP_EMPLOYEE_VESTING_ADDRESS || "0x...EMPLOYEE_VESTING_ADDRESS_HERE";
export const founderVestingAddress = process.env.REACT_APP_FOUNDER_VESTING_ADDRESS || "0x...FOUNDER_VESTING_ADDRESS_HERE";
export const investorVestingAddress = process.env.REACT_APP_INVESTOR_VESTING_ADDRESS || "0x...INVESTOR_VESTING_ADDRESS_HERE";
export const mockVestingAddress = process.env.REACT_APP_MOCK_VESTING_ADDRESS || "0x...MOCK_VESTING_ADDRESS_HERE";

export const loyaltyPointABI = ${JSON.stringify(loyaltyPointABI, null, 2)} as const;

export const employeeVestingABI = ${JSON.stringify(employeeVestingABI, null, 2)} as const;

export const founderVestingABI = ${JSON.stringify(founderVestingABI, null, 2)} as const;

export const investorVestingABI = ${JSON.stringify(investorVestingABI, null, 2)} as const;

export const mockVestingABI = ${JSON.stringify(mockVestingABI, null, 2)} as const;
`;

fs.writeFileSync(path.resolve(__dirname, '../contracts.ts'), content);
