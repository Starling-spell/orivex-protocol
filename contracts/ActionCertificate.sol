// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

contract ActionCertificate is AccessControl {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    enum Status { CREATED, VERIFYING, SUCCESS, FAILED, INCONCLUSIVE }
    struct Certificate { uint256 agentId; address submitter; string claim; string evidenceURI; Status status; bytes32 proofHash; uint64 createdAt; }
    uint256 public nextCertificateId = 1;
    mapping(uint256 => Certificate) public certificates;
    mapping(uint256 => bytes32) public capabilityHashes;
    AgentRegistry public immutable registry;
    event ActionSubmitted(uint256 indexed certificateId, uint256 indexed agentId, string claim);
    event CertificateFinalized(uint256 indexed certificateId, Status status, bytes32 proofHash);
    constructor(address admin, AgentRegistry registry_) {
        require(admin != address(0) && address(registry_).code.length > 0, "invalid configuration");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        registry = registry_;
    }
    function submitAction(uint256 agentId, string calldata claim, string calldata evidenceURI) external returns (uint256 id) {
        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        require(agent.owner == msg.sender, "not agent owner");
        require(bytes(claim).length > 0 && bytes(claim).length <= 2048, "invalid claim");
        require(bytes(evidenceURI).length > 0 && bytes(evidenceURI).length <= 2048, "invalid evidence");
        id=nextCertificateId++; certificates[id]=Certificate(agentId,msg.sender,claim,evidenceURI,Status.CREATED,bytes32(0),uint64(block.timestamp)); emit ActionSubmitted(id,agentId,claim);
        capabilityHashes[id] = keccak256(bytes(agent.capabilities));
    }
    function requestVerification(uint256 id) external { require(certificates[id].submitter==msg.sender,"not submitter"); require(certificates[id].status==Status.CREATED,"invalid state"); certificates[id].status=Status.VERIFYING; }
    function submitEvidence(uint256 id, string calldata evidenceURI) external {
        require(certificates[id].submitter == msg.sender, "not submitter");
        require(certificates[id].status == Status.CREATED, "evidence locked");
        require(bytes(evidenceURI).length > 0 && bytes(evidenceURI).length <= 2048, "invalid evidence");
        certificates[id].evidenceURI = evidenceURI;
    }
    function finalizeCertificate(uint256 id, Status status, bytes32 proofHash) external onlyRole(VALIDATOR_ROLE) {
        require(certificates[id].submitter != address(0), "unknown certificate");
        require(certificates[id].status == Status.VERIFYING, "invalid state");
        require(status >= Status.SUCCESS && proofHash != bytes32(0), "bad result");
        certificates[id].status=status; certificates[id].proofHash=proofHash; emit CertificateFinalized(id,status,proofHash);
    }
    function getCertificate(uint256 id) external view returns (Certificate memory) {
        require(certificates[id].submitter != address(0), "unknown certificate");
        return certificates[id];
    }
}
