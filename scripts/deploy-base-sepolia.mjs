import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createPublicClient, decodeEventLog, encodeDeployData, formatEther, getAddress, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { forgeBinary } from './forge-binary.mjs';

const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
const keystore = args.includes('--account') ? option('--account') : undefined;
const sender = process.env.DEPLOYER_ADDRESS;
if (!keystore || !sender) {
  console.error('Set DEPLOYER_ADDRESS to a funded public address and pass --account <encrypted-keystore-name>. Never pass a private key.');
  process.exit(1);
}
const admin = getAddress(sender);
const rpc = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const client = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
if (await client.getChainId() !== 84532) throw new Error('Refusing deployment: RPC must be Base Sepolia (84532).');
const build = spawnSync(process.execPath, ['scripts/compile-contracts.mjs'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(1);
const artifact = JSON.parse(fs.readFileSync('artifacts/OrivexDeployment.json', 'utf8'));
const data = encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode });
const gas = await client.estimateGas({ account: admin, data });
const fees = await client.estimateFeesPerGas();
const expected = gas * fees.maxFeePerGas * 120n / 100n;
console.log(`Base Sepolia (84532). Admin: ${admin}. Four contracts, one transaction.`);
console.log(`Estimated execution gas with margin: ${formatEther(expected)} test ETH (Base data fees are additional).`);
if (await client.getBalance({ address: admin }) < expected) throw new Error('Fund the deployer with Base Sepolia test ETH first.');
if (!args.includes('--broadcast')) {
  console.log('Preflight passed. Add --broadcast to sign with the encrypted keystore and deploy.');
  process.exit(0);
}
const startedAt = Date.now();
const result = spawnSync(forgeBinary, ['script', 'script/Deploy.s.sol:Deploy', '--rpc-url', rpc, '--account', keystore,
  '--sender', admin, '--chain', '84532', '--broadcast'], { stdio: 'inherit', shell: false });
if (result.error) throw new Error('Foundry forge is unavailable. Install Foundry or use the website’s wallet deployment flow.');
if (result.status !== 0) process.exit(result.status || 1);
const broadcastFile = 'broadcast/Deploy.s.sol/84532/run-latest.json';
if (fs.statSync(broadcastFile).mtimeMs < startedAt) throw new Error('No fresh broadcast record found.');
const broadcast = JSON.parse(fs.readFileSync(broadcastFile, 'utf8'));
const tx = broadcast.transactions.find(tx => tx.contractName === 'OrivexDeployment' && tx.transactionType === 'CREATE');
if (!tx?.hash) throw new Error('Deployment transaction not found.');
const receipt = await client.waitForTransactionReceipt({ hash: tx.hash, confirmations: 2 });
if (receipt.status !== 'success') throw new Error('Deployment reverted.');
const decoded = receipt.logs.map(log => {
  try { return decodeEventLog({ abi: artifact.abi, data: log.data, topics: log.topics }); } catch { return undefined; }
}).find(log => log?.eventName === 'ProtocolDeployed');
if (!decoded || getAddress(decoded.args.admin) !== admin) throw new Error('Deployment owner mismatch.');
fs.mkdirSync('deployments', { recursive: true });
const deployment = { chainId: 84532, transactionHash: tx.hash, blockNumber: String(receipt.blockNumber), ...decoded.args };
fs.writeFileSync('deployments/base-sepolia.json', JSON.stringify(deployment, null, 2));
const mapping = { registry: 'VITE_AGENT_REGISTRY_ADDRESS', certificates: 'VITE_ACTION_CERTIFICATE_ADDRESS', reputation: 'VITE_REPUTATION_REGISTRY_ADDRESS', permissions: 'VITE_AGENT_PERMISSION_ADDRESS' };
let env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
for (const [name, variable] of Object.entries(mapping)) {
  env = env.replace(new RegExp(`^${variable}=.*(?:\\r?\\n|$)`, 'm'), '');
  env += `\n${variable}=${getAddress(decoded.args[name])}\n`;
}
fs.writeFileSync('.env.local', env);
console.log(`Confirmed: https://sepolia.basescan.org/tx/${tx.hash}`);
console.log('Saved deployments/base-sepolia.json and updated .env.local. Restart the frontend.');
