// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {AgentRegistry} from "../contracts/AgentRegistry.sol";
import {ActionCertificate} from "../contracts/ActionCertificate.sol";
import {ReputationRegistry} from "../contracts/ReputationRegistry.sol";
import {AgentPermission} from "../contracts/AgentPermission.sol";
import {OrivexDeployment} from "../contracts/OrivexDeployment.sol";

interface VmTest {
    function prank(address) external;
    function expectRevert() external;
    function warp(uint256) external;
    function chainId(uint256) external;
    function recordLogs() external;
    struct Log { bytes32[] topics; bytes data; address emitter; }
    function getRecordedLogs() external returns (Log[] memory);
}

contract ProtocolTest {
    VmTest private constant vm = VmTest(address(uint160(uint256(keccak256("hevm cheat code")))));
    AgentRegistry registry;
    ActionCertificate certificates;
    ReputationRegistry reputation;
    AgentPermission permissions;
    address constant stranger = address(0xBEEF);
    bytes32 constant proof = keccak256("test-only-consensus-proof");

    function setUp() public {
        registry = new AgentRegistry(address(this));
        certificates = new ActionCertificate(address(this), registry);
        reputation = new ReputationRegistry(address(this), certificates);
        permissions = new AgentPermission(address(this));
        registry.registerAgent("Research", "ipfs://agent-metadata");
    }
    function test_RegistrationRejectsEmptyMetadataAndCapability() public {
        vm.expectRevert(); registry.registerAgent("Research", "");
        vm.expectRevert(); registry.registerAgent("", "ipfs://metadata");
        vm.expectRevert(); registry.getAgent(999);
    }
    function test_StrangersCannotSubmitActionsForOtherAgents() public {
        vm.prank(stranger); vm.expectRevert(); certificates.submitAction(1, "claim", "ipfs://evidence");
        vm.expectRevert(); certificates.submitAction(999, "claim", "ipfs://evidence");
    }
    function test_CertificateCannotFinalizeBeforeVerificationOrTwice() public {
        certificates.grantRole(certificates.VALIDATOR_ROLE(), address(this));
        uint256 id = certificates.submitAction(1, "claim", "ipfs://evidence");
        vm.expectRevert(); certificates.finalizeCertificate(id, ActionCertificate.Status.SUCCESS, proof);
        certificates.requestVerification(id);
        vm.expectRevert(); certificates.finalizeCertificate(id, ActionCertificate.Status.SUCCESS, bytes32(0));
        certificates.finalizeCertificate(id, ActionCertificate.Status.SUCCESS, proof);
        vm.expectRevert(); certificates.finalizeCertificate(id, ActionCertificate.Status.FAILED, proof);
        vm.expectRevert(); certificates.finalizeCertificate(999, ActionCertificate.Status.SUCCESS, proof);
    }
    function test_EvidenceIsLockedDuringVerification() public {
        uint256 id = certificates.submitAction(1, "claim", "ipfs://evidence");
        vm.prank(stranger); vm.expectRevert(); certificates.submitEvidence(id, "ipfs://forged");
        certificates.submitEvidence(id, "ipfs://updated");
        certificates.requestVerification(id);
        vm.expectRevert(); certificates.submitEvidence(id, "ipfs://replaced");
    }
    function test_DefaultDeploymentDoesNotTrustAnAdminAsValidator() public {
        uint256 id = certificates.submitAction(1, "claim", "ipfs://evidence");
        certificates.requestVerification(id);
        vm.expectRevert(); certificates.finalizeCertificate(id, ActionCertificate.Status.SUCCESS, proof);
    }
    function test_ReputationRejectsUnverifiedAndDuplicateCertificates() public {
        uint256 id = certificates.submitAction(1, "claim", "ipfs://evidence");
        vm.expectRevert(); reputation.addCertificate(id);
        certificates.requestVerification(id);
        certificates.grantRole(certificates.VALIDATOR_ROLE(), address(this));
        certificates.finalizeCertificate(id, ActionCertificate.Status.SUCCESS, proof);
        vm.prank(stranger); reputation.addCertificate(id);
        vm.expectRevert(); reputation.addCertificate(id);
        (uint32 success, uint32 failed, uint256 score) = reputation.getReputation(1, "Research");
        require(success == 1 && failed == 0 && score == 100, "wrong derived reputation");
    }
    function test_InconclusiveDoesNotBecomeFailure() public {
        uint256 id = certificates.submitAction(1, "claim", "ipfs://evidence");
        certificates.requestVerification(id);
        certificates.grantRole(certificates.VALIDATOR_ROLE(), address(this));
        certificates.finalizeCertificate(id, ActionCertificate.Status.INCONCLUSIVE, proof);
        vm.expectRevert(); reputation.addCertificate(id);
    }
    function testFuzz_PermissionCannotSpendBudgetTwice(uint128 rawBudget) public {
        uint256 budget = uint256(rawBudget) + 1;
        uint256 id = permissions.createPermission(address(this), budget, proof, uint64(block.timestamp + 1 days));
        permissions.consumePermission(id, budget, proof);
        require(!permissions.isAuthorized(id, address(this), 1, proof), "budget restored");
        vm.expectRevert(); permissions.consumePermission(id, 1, proof);
    }
    function test_ExpiredRevokedWrongPurposeAndWrongAgentPermissionsFail() public {
        uint256 id = permissions.createPermission(address(this), 500e6, proof, uint64(block.timestamp + 1 days));
        vm.prank(stranger); vm.expectRevert(); permissions.consumePermission(id, 80e6, proof);
        vm.expectRevert(); permissions.consumePermission(id, 80e6, keccak256("different purpose"));
        vm.warp(block.timestamp + 1 days);
        vm.expectRevert(); permissions.consumePermission(id, 80e6, proof);
        id = permissions.createPermission(address(this), 500e6, proof, uint64(block.timestamp + 1 days));
        permissions.revokePermission(id);
        vm.expectRevert(); permissions.consumePermission(id, 80e6, proof);
    }
    function test_DeploymentAssignsRolesToSignerAndRejectsMainnet() public {
        vm.chainId(84532);
        vm.recordLogs();
        new OrivexDeployment();
        VmTest.Log[] memory logs = vm.getRecordedLogs();
        VmTest.Log memory last = logs[logs.length - 1];
        (address r, address c, address rep, address p) = abi.decode(last.data, (address, address, address, address));
        require(registry.DEFAULT_ADMIN_ROLE() == bytes32(0), "role mismatch");
        require(AgentRegistry(r).hasRole(bytes32(0), address(this)), "registry owner");
        require(ActionCertificate(c).hasRole(bytes32(0), address(this)), "certificate owner");
        require(ReputationRegistry(rep).hasRole(bytes32(0), address(this)), "reputation owner");
        require(AgentPermission(p).hasRole(bytes32(0), address(this)), "permission owner");
        require(!ActionCertificate(c).hasRole(certificates.VALIDATOR_ROLE(), address(this)), "unexpected validator");
        vm.chainId(8453);
        vm.expectRevert(); new OrivexDeployment();
    }
}
