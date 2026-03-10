export type ThreatCategory =
  | 'direct_injection'
  | 'jailbreak'
  | 'encoding_evasion'
  | 'multi_turn_manipulation'
  | 'authority_escalation'
  | 'indirect_injection'
  | 'api_key'
  | 'private_key'
  | 'pii'
  | 'token';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface ThreatMatch {
  patternId: string;
  category: ThreatCategory;
  severity: Severity;
  description: string;
  /** injection: excerpt ≤120 chars; secrets: "[REDACTED: N chars]" */
  matchedText: string;
  matchedTextRedacted: boolean;
}

export interface ScanResult {
  safe: boolean;
  threats: ThreatMatch[];
  maxSeverity?: Severity;
  /** Populated when GuardConfig.redactSecrets=true and threats found */
  redactedText?: string;
}

export interface GuardConfig {
  suppressPatterns?: string[];
  minSeverity?: Severity;
  redactSecrets?: boolean;
}

export class InjectionBlockedError extends Error {
  constructor(public readonly threats: ThreatMatch[]) {
    super(`Injection detected: ${threats.map(t => t.patternId).join(', ')}`);
    this.name = 'InjectionBlockedError';
  }
}

export class SecretLeakError extends Error {
  constructor(public readonly threats: ThreatMatch[]) {
    super(`Secret leakage detected: ${threats.map(t => t.patternId).join(', ')}`);
    this.name = 'SecretLeakError';
  }
}
