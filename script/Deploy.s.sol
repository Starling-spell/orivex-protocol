// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OrivexDeployment} from "../contracts/OrivexDeployment.sol";
interface VmDeploy {
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract Deploy {
    VmDeploy private constant vm = VmDeploy(address(uint160(uint256(keccak256("hevm cheat code")))));
    function run() external returns (OrivexDeployment deployment) {
        require(block.chainid == 84532, "Base Sepolia only");
        vm.startBroadcast();
        deployment = new OrivexDeployment();
        vm.stopBroadcast();
    }
}
