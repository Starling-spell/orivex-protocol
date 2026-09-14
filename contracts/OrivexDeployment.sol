// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentRegistry} from "./AgentRegistry.sol";
import {ActionCertificate} from "./ActionCertificate.sol";
import {ReputationRegistry} from "./ReputationRegistry.sol";
import {AgentPermission} from "./AgentPermission.sol";

/// @notice Atomic testnet deployment. The signing wallet owns all admin roles.
/// Verification roles intentionally remain unassigned until a consensus bridge exists.
contract OrivexDeployment {
    event ProtocolDeployed(address indexed admin, address registry, address certificates, address reputation, address permissions);

    constructor() {
        require(block.chainid == 84532 || block.chainid == 31337, "testnet only");
        AgentRegistry registry = new AgentRegistry(msg.sender);
        ActionCertificate certificates = new ActionCertificate(msg.sender, registry);
        ReputationRegistry reputation = new ReputationRegistry(msg.sender, certificates);
        AgentPermission permissions = new AgentPermission(msg.sender);
        emit ProtocolDeployed(msg.sender, address(registry), address(certificates), address(reputation), address(permissions));
    }
}
