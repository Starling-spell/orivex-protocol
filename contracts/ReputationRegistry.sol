// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ActionCertificate} from "./ActionCertificate.sol";

contract ReputationRegistry is AccessControl {
    struct CapabilityScore { uint32 success; uint32 failed; }
    mapping(uint256 => mapping(bytes32 => CapabilityScore)) private scores;
    mapping(uint256 => bool) public counted;
    ActionCertificate public immutable certificateRegistry;
    event ReputationUpdated(uint256 indexed certificateId, uint256 indexed agentId, bytes32 capability);
    constructor(address admin, ActionCertificate certificates_) {
        require(admin != address(0) && address(certificates_).code.length > 0, "invalid configuration");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        certificateRegistry = certificates_;
    }
    function addCertificate(uint256 certificateId) external {
        require(!counted[certificateId], "already counted");
        ActionCertificate.Certificate memory certificate = certificateRegistry.getCertificate(certificateId);
        require(certificate.status == ActionCertificate.Status.SUCCESS || certificate.status == ActionCertificate.Status.FAILED, "not conclusive");
        bytes32 capability = certificateRegistry.capabilityHashes(certificateId);
        counted[certificateId] = true;
        CapabilityScore storage s = scores[certificate.agentId][capability];
        if(certificate.status == ActionCertificate.Status.SUCCESS) { s.success++; } else { s.failed++; }
        emit ReputationUpdated(certificateId, certificate.agentId, capability);
    }
    function getReputation(uint256 agentId, string calldata capability) external view returns(uint32 success,uint32 failed,uint256 score){ CapabilityScore memory s=scores[agentId][keccak256(bytes(capability))]; success=s.success; failed=s.failed; uint256 total=uint256(success)+failed; score=total==0?0:(uint256(success)*100)/total; }
}
