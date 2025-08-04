// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPartnerVesting {
    function createPartnerVesting(
        address beneficiary
    ) external;
}
