import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const KEY_FILE = join(process.env.HOME ?? process.env.USERPROFILE ?? '.', '.mandate', 'runtime-key');

// In-memory cache
let cachedKey = '';

export function setRuntimeKey(key: string): void {
  if (!key) return;
  cachedKey = key;
  // Persist to file for cross-process access
  try {
    mkdirSync(join(process.env.HOME ?? process.env.USERPROFILE ?? '.', '.mandate'), { recursive: true });
    writeFileSync(KEY_FILE, key, { mode: 0o600 });
  } catch {}
}

export function getRuntimeKey(): string {
  if (cachedKey) return cachedKey;
  // Try reading from file
  try {
    const key = readFileSync(KEY_FILE, 'utf-8').trim();
    if (key) {
      cachedKey = key;
      return key;
    }
  } catch {}
  return '';
}
