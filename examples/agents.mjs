const base = 'https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/c64a1edb67b6e3f4a15cca8909c9482ad33a02b0/';

// These small deterministic agent programs propose claims. Only GenLayer judges them.
export const agents = [
  {
    id: 'license-scout', name: 'License Scout', capability: 'License research', file: 'LICENSE', expected: 'SUCCESS',
    criterion: 'Check the document for an explicit permission to distribute and an obligation to retain copyright and permission notices. Refutation means FAILED; missing information means INCONCLUSIVE.',
    analyze(text) {
      if (!text.includes('distribute') || !text.includes('copyright notice')) throw new Error('License Scout could not extract distribution terms.');
      return 'The license permits software redistribution subject to retaining its copyright and permission notices.';
    },
  },
  {
    id: 'ownership-reviewer', name: 'Ownership Reviewer', capability: 'Source review', file: 'contracts/access/Ownable.sol', expected: 'SUCCESS',
    criterion: 'Assess only the supplied source. SUCCESS if transferOwnership is restricted to the current owner and rejects a zero newOwner; FAILED if contradicted; INCONCLUSIVE if either behavior cannot be established. This is not a complete security audit.',
    analyze(text) {
      if (!text.includes('function transferOwnership') || !text.includes('onlyOwner')) throw new Error('Ownership Reviewer could not locate the access control.');
      return 'The transferOwnership function can only be called by the current owner and rejects the zero address as its new owner.';
    },
  },
  {
    id: 'release-inspector', name: 'Release Inspector', capability: 'Release analysis', file: 'package.json', expected: 'SUCCESS',
    criterion: 'Compare the claim to the package.json name, version and license fields. SUCCESS if all match, FAILED if any conflict, INCONCLUSIVE if a required field is missing. Do not infer published or installed package authenticity.',
    analyze(text) {
      const pkg = JSON.parse(text);
      return `The package manifest declares name ${pkg.name}, version ${pkg.version}, and license ${pkg.license}.`;
    },
  },
  {
    id: 'false-claim-control', name: 'False Claim Control', capability: 'Negative control', file: 'LICENSE', expected: 'FAILED',
    criterion: 'Assess whether this license explicitly forbids selling the software. An explicit permission to sell refutes that claim and means FAILED. Missing relevant language means INCONCLUSIVE.',
    analyze() { return 'The supplied license explicitly prohibits selling copies of the software.'; },
  },
  {
    id: 'provenance-control', name: 'Provenance Control', capability: 'Evidence sufficiency', file: 'LICENSE', expected: 'INCONCLUSIVE',
    criterion: 'SUCCESS requires evidence of the named agent executing that audit on the named date. FAILED requires evidence refuting it. A software license alone does not establish who audited the code or when; absent evidence means INCONCLUSIVE.',
    analyze() { return 'Orivex Audit Agent completed a full security audit of this software on 2026-09-13.'; },
  },
].map(agent => ({ ...agent, evidenceUrl: base + agent.file, reference: `orivex:agent:${agent.id}:v1` }));
