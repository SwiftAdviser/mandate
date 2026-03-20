import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const KEY_FILE = join(process.env.HOME ?? process.env.USERPROFILE ?? '.', '.mandate', 'runtime-key');

let cachedKey = '';

export function setRuntimeKey(key: string): void {
  cachedKey = key;
  if (key) {
    try {
      mkdirSync(join(process.env.HOME ?? process.env.USERPROFILE ?? '.', '.mandate'), { recursive: true });
      writeFileSync(KEY_FILE, key, { mode: 0o600 });
    } catch {}
  }
}

export function getRuntimeKey(): string {
  if (cachedKey) return cachedKey;
  try {
    const key = readFileSync(KEY_FILE, 'utf-8').trim();
    if (key) {
      cachedKey = key;
      return key;
    }
  } catch {}
  return '';
}
