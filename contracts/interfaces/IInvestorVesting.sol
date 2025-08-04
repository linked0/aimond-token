// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IInvestorVesting {
    function createInvestorVesting(
        address beneficiary
    ) external;
}
