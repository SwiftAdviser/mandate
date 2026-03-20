// Runtime key storage: in-memory cache + file persistence.
// No env vars, no os module. Path derived from plugin install location.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// When installed: ~/.openclaw/extensions/<plugin>/dist/index.js
// Resolve up to ~/.openclaw/, then store in mandate-data/runtime-key
const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(THIS_DIR, '..', '..', '..', 'mandate-data');
const KEY_FILE = join(DATA_DIR, 'runtime-key');

let cachedKey = '';

export function setRuntimeKey(key: string): void {
  cachedKey = key;
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(KEY_FILE, key, 'utf-8');
  } catch {
    // File persistence is best-effort; in-memory still works
  }
}

export function getRuntimeKey(): string {
  if (cachedKey) return cachedKey;
  try {
    if (existsSync(KEY_FILE)) {
      cachedKey = readFileSync(KEY_FILE, 'utf-8').trim();
    }
  } catch {
    // File read failed; return empty
  }
  return cachedKey;
}

/** Reset in-memory cache (for testing). */
export function clearKeyCache(): void {
  cachedKey = '';
}
