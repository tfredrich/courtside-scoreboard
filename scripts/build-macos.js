import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') {
  console.error('The native preview requires macOS and the Swift compiler.');
  process.exit(1);
}

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'build/macos');
mkdirSync(output, { recursive: true });
const result = spawnSync('swiftc', [
  '-module-cache-path', join(tmpdir(), 'courtside-swift-cache'),
  join(root, 'native/macos/launcher.swift'),
  '-o', join(output, 'courtside-preview'),
  '-framework', 'Cocoa', '-framework', 'WebKit',
], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
