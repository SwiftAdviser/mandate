import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface MandateCredentials {
  runtimeKey: string;
  agentId: string;
  claimUrl: string;
  evmAddress?: string;
  chainId?: number;
  baseUrl?: string;
}

function credentialsPath(): string {
  return path.join(os.homedir(), '.mandate', 'credentials.json');
}

function credentialsDir(): string {
  return path.join(os.homedir(), '.mandate');
}

export function loadCredentials(): MandateCredentials | null {
  const p = credentialsPath();
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveCredentials(creds: MandateCredentials): void {
  const dir = credentialsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const p = credentialsPath();
  fs.writeFileSync(p, JSON.stringify(creds, null, 2));
  fs.chmodSync(p, 0o600);
}

export function updateCredentials(partial: Partial<MandateCredentials>): void {
  const existing = loadCredentials();
  if (!existing) {
    throw new Error('No existing credentials. Run: mandate login');
  }
  saveCredentials({ ...existing, ...partial });
}
