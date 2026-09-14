// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract AgentPermission is AccessControl {
    struct Permission { address agent; uint256 budgetUSDC; bytes32 purpose; uint64 expiresAt; bool active; }
    mapping(uint256 => Permission) public permissions;
    uint256 public nextPermissionId=1;
    event PermissionCreated(uint256 indexed id, address indexed agent, uint256 budgetUSDC);
    event PermissionConsumed(uint256 indexed id, uint256 amountUSDC);
    event PermissionRevoked(uint256 indexed id);
    constructor(address admin) { require(admin != address(0), "zero admin"); _grantRole(DEFAULT_ADMIN_ROLE, admin); }
    function createPermission(address agent,uint256 budgetUSDC,bytes32 purpose,uint64 expiresAt) external onlyRole(DEFAULT_ADMIN_ROLE) returns(uint256 id){require(expiresAt>block.timestamp,"expiry");require(agent != address(0) && budgetUSDC > 0 && purpose != bytes32(0), "invalid permission");id=nextPermissionId++;permissions[id]=Permission(agent,budgetUSDC,purpose,expiresAt,true);emit PermissionCreated(id,agent,budgetUSDC);}
    function isAuthorized(uint256 id,address agent,uint256 amount,bytes32 purpose) public view returns(bool){Permission memory p=permissions[id];return p.active&&p.agent==agent&&amount>0&&amount<=p.budgetUSDC&&p.purpose==purpose&&block.timestamp<p.expiresAt;}
    function consumePermission(uint256 id, uint256 amount, bytes32 purpose) external {
        require(isAuthorized(id, msg.sender, amount, purpose), "unauthorized");
        permissions[id].budgetUSDC -= amount;
        emit PermissionConsumed(id, amount);
    }
    function revokePermission(uint256 id) external onlyRole(DEFAULT_ADMIN_ROLE) { permissions[id].active = false; emit PermissionRevoked(id); }
}
