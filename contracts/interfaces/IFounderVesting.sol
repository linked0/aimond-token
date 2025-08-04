// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFounderVesting {
    function createFounderVesting(
        address beneficiary
    ) external;
}
