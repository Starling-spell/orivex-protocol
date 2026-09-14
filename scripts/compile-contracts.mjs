import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';

const names = ['AgentRegistry', 'ActionCertificate', 'ReputationRegistry', 'AgentPermission', 'OrivexDeployment'];
const sources = Object.fromEntries(names.map(name => [`contracts/${name}.sol`, { content: fs.readFileSync(`contracts/${name}.sol`, 'utf8') }]));
const input = { language: 'Solidity', sources, settings: {
  optimizer: { enabled: true, runs: 200 }, evmVersion: 'paris',
  remappings: ['@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/'],
  outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata'] } },
} };
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: name => {
  const file = path.resolve(name.startsWith('node_modules/') ? name : path.join('node_modules', name));
  if (!file.startsWith(path.resolve('node_modules') + path.sep)) return { error: 'Invalid import' };
  return fs.existsSync(file) ? { contents: fs.readFileSync(file, 'utf8') } : { error: `Missing import: ${name}` };
} }));
for (const error of output.errors ?? []) console.error(error.formattedMessage);
if ((output.errors ?? []).some(e => e.severity === 'error')) process.exit(1);
fs.mkdirSync('artifacts', { recursive: true });
for (const name of names) {
  const compiled = output.contracts[`contracts/${name}.sol`][name];
  fs.writeFileSync(`artifacts/${name}.json`, JSON.stringify({
    contractName: name, abi: compiled.abi, bytecode: `0x${compiled.evm.bytecode.object}`,
    deployedBytecode: `0x${compiled.evm.deployedBytecode.object}`, compiler: solc.version(),
  }, null, 2));
}
fs.writeFileSync('artifacts/compiler-input.json', JSON.stringify(input));
console.log(`Compiled ${names.length} contracts with ${solc.version()}`);
