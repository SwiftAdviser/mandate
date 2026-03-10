import type { ThreatCategory, Severity } from '../../types.js';

export interface SecretPattern {
  id: string;
  category: ThreatCategory;
  severity: Severity;
  description: string;
  /** Standard pattern — used unless custom is provided */
  pattern: RegExp;
  /** Optional compound logic — return matched string or null */
  custom?: (text: string) => string | null;
}

/** Luhn algorithm for credit card validation */
function luhnCheck(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/** Check for 12+ BIP39-style words: lowercase alpha, 3–8 chars each */
function findMnemonic(text: string): string | null {
  // BIP39 words are 3-8 lowercase letters; a valid mnemonic is 12, 15, 18, 21, or 24 words
  const wordSeq = /\b([a-z]{3,8})(?:\s+[a-z]{3,8}){11,23}\b/;
  const match = wordSeq.exec(text);
  if (!match) return null;
  // Verify all tokens are purely alpha (numbers/mixed = not a mnemonic)
  const words = match[0].split(/\s+/);
  if (words.every(w => /^[a-z]{3,8}$/.test(w))) {
    return match[0].slice(0, 120);
  }
  return null;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  {
    id: 'sec_001',
    category: 'private_key',
    severity: 'critical',
    description: 'Ethereum/EVM private key (64-char hex)',
    pattern: /\b[0-9a-fA-F]{64}\b/,
    custom: (text: string): string | null => {
      const hexPattern = /\b([0-9a-fA-F]{64})\b/g;
      const keywordNear = /\b(private|key|secret|priv|pk)\b/i;
      const txHashNear = /\b(txhash|txHash|transactionhash|transactionHash|tx_hash)\b/i;
      let match: RegExpExecArray | null;
      while ((match = hexPattern.exec(text)) !== null) {
        const window = text.slice(Math.max(0, match.index - 80), match.index + match[0].length + 80);
        if (keywordNear.test(window) && !txHashNear.test(window)) {
          return match[0];
        }
      }
      return null;
    },
  },
  {
    id: 'sec_002',
    category: 'api_key',
    severity: 'critical',
    description: 'OpenAI API key',
    pattern: /\bsk-[a-zA-Z0-9]{20,}\b/,
  },
  {
    id: 'sec_003',
    category: 'api_key',
    severity: 'critical',
    description: 'Anthropic API key',
    pattern: /\bsk-ant-[a-zA-Z0-9\-_]{20,}\b/,
  },
  {
    id: 'sec_004',
    category: 'token',
    severity: 'high',
    description: 'HTTP Bearer token',
    pattern: /\bBearer\s+[A-Za-z0-9\-_.]{32,}/,
  },
  {
    id: 'sec_005',
    category: 'api_key',
    severity: 'critical',
    description: 'AWS Access Key ID',
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    id: 'sec_006',
    category: 'api_key',
    severity: 'high',
    description: 'AWS Secret Access Key',
    pattern: /[A-Za-z0-9/+=]{40}/,
    custom: (text: string): string | null => {
      const awsSecret = /\baws[_\s]?secret[_\s]?access[_\s]?key\b/i;
      if (!awsSecret.test(text)) return null;
      const keyPattern = /[A-Za-z0-9/+=]{40}/g;
      const match = keyPattern.exec(text);
      return match ? match[0] : null;
    },
  },
  {
    id: 'sec_007',
    category: 'api_key',
    severity: 'critical',
    description: 'GitHub Personal Access Token',
    pattern: /\bgh[pours]_[A-Za-z0-9]{36,}\b/,
  },
  {
    id: 'sec_008',
    category: 'private_key',
    severity: 'critical',
    description: 'BIP39 mnemonic seed phrase (12+ words)',
    pattern: /\b([a-z]{3,8}\s+){11}[a-z]{3,8}\b/,
    custom: findMnemonic,
  },
  {
    id: 'sec_009',
    category: 'pii',
    severity: 'high',
    description: 'Credit/debit card number (Luhn-valid)',
    pattern: /\b(?:\d[\s\-]?){12,18}\d\b/,
    custom: (text: string): string | null => {
      // Find digit sequences (13-19 digits, ignoring separators)
      const candidates = /\b[\d][\d\s\-]{11,20}[\d]\b/g;
      let match: RegExpExecArray | null;
      while ((match = candidates.exec(text)) !== null) {
        const digits = match[0].replace(/[\s\-]/g, '');
        if (digits.length >= 13 && digits.length <= 19 && luhnCheck(digits)) {
          return match[0];
        }
      }
      return null;
    },
  },
  {
    id: 'sec_010',
    category: 'token',
    severity: 'medium',
    description: 'JSON Web Token (JWT)',
    pattern: /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/]*/,
  },
];
