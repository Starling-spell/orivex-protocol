import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const platform = process.platform;
const architecture = process.arch === 'x64' ? 'amd64' : process.arch;
const binary = platform === 'win32' ? 'forge.exe' : 'forge';
let resolved = binary;
try { resolved = require.resolve(`@foundry-rs/forge-${platform}-${architecture}/bin/${binary}`); }
catch { /* A system Foundry installation is also supported. */ }
export const forgeBinary = resolved;
