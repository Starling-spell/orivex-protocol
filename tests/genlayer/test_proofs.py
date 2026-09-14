import hashlib
import json

import pytest


BODY = b"Independent report: the agent completed all required steps."
URL = "https://raw.githubusercontent.com/example/evidence/" + "a" * 40 + "/report.txt"


@pytest.fixture
def registry(direct_deploy):
    return direct_deploy("contracts/OrivexProofRegistry.py")


def submit(registry, reference="action-1", url=URL, digest=None):
    return registry.submit_proof(reference, "The action completed", "All steps completed", url,
                                 digest or hashlib.sha256(BODY).hexdigest())


def mocks(vm, status="SUCCESS", body=BODY):
    vm.clear_mocks()
    vm.mock_web(r"raw\.githubusercontent\.com", {"status": 200, "body": body})
    vm.mock_llm(r"Evaluate this Orivex proof", json.dumps({"status": status}))


@pytest.mark.parametrize("status", ["SUCCESS", "FAILED", "INCONCLUSIVE"])
def test_finalization_and_hash(registry, direct_vm, status):
    proof_id = submit(registry)
    mocks(direct_vm, status)
    digest = registry.verify_proof(proof_id)
    record = json.loads(registry.get_proof(proof_id))
    assert record.pop("proof_hash") == digest
    assert record["status"] == status
    assert hashlib.sha256(json.dumps(record, sort_keys=True, separators=(",", ":"),
                                    ensure_ascii=True).encode()).hexdigest() == digest
    with direct_vm.expect_revert("proof already finalized"):
        registry.verify_proof(proof_id)


def test_submitter_ownership_and_reference_namespace(registry, direct_vm, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    alice_id = submit(registry)
    with direct_vm.expect_revert("reference already submitted"):
        submit(registry)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("only submitter"):
        registry.verify_proof(alice_id)
    bob_id = submit(registry)
    assert alice_id != bob_id
    assert registry.get_proof_id(direct_alice, "action-1") == alice_id
    assert registry.get_proof_id(direct_bob, "action-1") == bob_id
    assert registry.total_proofs() == 2


@pytest.mark.parametrize("body", [b"tampered", b"", b"x" * 24001], ids=["tampered", "empty", "oversized"])
def test_invalid_evidence_never_finalizes(registry, direct_vm, body):
    proof_id = submit(registry)
    mocks(direct_vm, body=body)
    with direct_vm.expect_revert("[EXTERNAL]"):
        registry.verify_proof(proof_id)
    assert json.loads(registry.get_proof(proof_id))["status"] == "PENDING"


def test_validators_independently_check_decision_and_hash(registry, direct_vm):
    proof_id = submit(registry)
    mocks(direct_vm)
    registry.verify_proof(proof_id)
    assert direct_vm.run_validator() is True
    mocks(direct_vm, "FAILED")
    assert direct_vm.run_validator() is False
    mocks(direct_vm, body=b"tampered")
    assert direct_vm.run_validator() is False
    assert direct_vm.run_validator(leader_error=Exception("[LLM_ERROR] bad response")) is False
    assert direct_vm.run_validator(leader_result={"status": "made-up"}) is False


def test_malformed_llm_does_not_write(registry, direct_vm):
    proof_id = submit(registry)
    mocks(direct_vm, "made-up")
    with direct_vm.expect_revert("[LLM_ERROR]"):
        registry.verify_proof(proof_id)
    assert json.loads(registry.get_proof(proof_id))["status"] == "PENDING"


@pytest.mark.parametrize("url", [
    "http://localhost/report.txt", "https://127.0.0.1/report.txt",
    "https://raw.githubusercontent.com/example/evidence/main/report.txt",
    "https://raw.githubusercontent.com/example/evidence/long-branch/report.txt",
    URL + "?redirect=http://localhost", URL + "/../secret", URL + "#fragment",
])
def test_rejects_unpinned_and_noncanonical_sources(registry, direct_vm, url):
    with direct_vm.expect_revert("[EXTERNAL]"):
        submit(registry, url=url)
    assert registry.total_proofs() == 0
