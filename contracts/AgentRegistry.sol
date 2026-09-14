// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract AgentRegistry is AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    struct Agent { address owner; string capabilities; string metadataURI; uint64 createdAt; bool verified; }
    uint256 public nextAgentId = 1;
    mapping(uint256 => Agent) private agents;
    event AgentRegistered(uint256 indexed agentId, address indexed owner, string metadataURI);
    event AgentVerified(uint256 indexed agentId, bool verified);
    constructor(address admin) { require(admin != address(0), "zero admin"); _grantRole(DEFAULT_ADMIN_ROLE, admin); }
    function registerAgent(string calldata capabilities, string calldata metadataURI) external returns (uint256 id) {
        require(bytes(capabilities).length > 0 && bytes(capabilities).length <= 256, "invalid capabilities");
        require(bytes(metadataURI).length > 0 && bytes(metadataURI).length <= 2048, "invalid metadata");
        id = nextAgentId++; agents[id] = Agent(msg.sender, capabilities, metadataURI, uint64(block.timestamp), false); emit AgentRegistered(id, msg.sender, metadataURI);
    }
    function verifyAgent(uint256 id, bool value) external onlyRole(VERIFIER_ROLE) { require(agents[id].owner != address(0), "unknown agent"); agents[id].verified=value; emit AgentVerified(id,value); }
    function getAgent(uint256 id) external view returns (Agent memory) { require(agents[id].owner != address(0), "unknown agent"); return agents[id]; }
}
