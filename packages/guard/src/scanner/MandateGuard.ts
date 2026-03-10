import type { GuardConfig, ScanResult, Severity, ThreatMatch } from '../types.js';
import { normalize } from './normalize.js';
import { INJECTION_PATTERNS, ENCODING_EVASION_IDS } from './patterns/injection.js';
import { SECRET_PATTERNS } from './patterns/secrets.js';

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function maxSeverity(threats: ThreatMatch[]): Severity | undefined {
  if (threats.length === 0) return undefined;
  return threats.reduce<Severity>(
    (max, t) => SEVERITY_ORDER[t.severity] > SEVERITY_ORDER[max] ? t.severity : max,
    'low',
  );
}

function meetsSeverity(severity: Severity, min: Severity): boolean {
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[min];
}

function applyFilters(threats: ThreatMatch[], config: GuardConfig): ThreatMatch[] {
  return threats.filter(t => {
    if (config.suppressPatterns?.includes(t.patternId)) return false;
    if (config.minSeverity && !meetsSeverity(t.severity, config.minSeverity)) return false;
    return true;
  });
}

function redactText(text: string, _threats: ThreatMatch[]): string {
  // Re-run secret patterns to find actual positions and redact
  let result = text;
  for (const p of SECRET_PATTERNS) {
    const pat = new RegExp(p.pattern.source, p.pattern.flags + (p.pattern.flags.includes('g') ? '' : 'g'));
    result = result.replace(pat, m => `[REDACTED: ${m.length} chars]`);
  }
  return result;
}

export class MandateGuard {
  private readonly config: Required<GuardConfig>;

  constructor(config: GuardConfig = {}) {
    this.config = {
      suppressPatterns: config.suppressPatterns ?? [],
      minSeverity: config.minSeverity ?? 'low',
      redactSecrets: config.redactSecrets ?? false,
    };
  }

  scanInput(text: string): ScanResult {
    const threats: ThreatMatch[] = [];
    const clean = normalize(text);

    for (const p of INJECTION_PATTERNS) {
      const scanText = ENCODING_EVASION_IDS.has(p.id) ? text : clean;

      let matchedExcerpt: string | null = null;

      if (p.custom) {
        matchedExcerpt = p.custom(scanText);
      } else {
        const m = p.pattern.exec(scanText);
        if (m) matchedExcerpt = m[0].slice(0, 120);
      }

      if (matchedExcerpt !== null) {
        threats.push({
          patternId: p.id,
          category: p.category,
          severity: p.severity,
          description: p.description,
          matchedText: matchedExcerpt.slice(0, 120),
          matchedTextRedacted: false,
        });
      }
    }

    const filtered = applyFilters(threats, this.config);
    return {
      safe: filtered.length === 0,
      threats: filtered,
      maxSeverity: maxSeverity(filtered),
    };
  }

  scanOutput(text: string): ScanResult {
    const threats: ThreatMatch[] = [];

    for (const p of SECRET_PATTERNS) {
      let matchedValue: string | null = null;

      if (p.custom) {
        matchedValue = p.custom(text);
      } else {
        const m = p.pattern.exec(text);
        if (m) matchedValue = m[0];
      }

      if (matchedValue !== null) {
        threats.push({
          patternId: p.id,
          category: p.category,
          severity: p.severity,
          description: p.description,
          matchedText: `[REDACTED: ${matchedValue.length} chars]`,
          matchedTextRedacted: true,
        });
      }
    }

    const filtered = applyFilters(threats, this.config);
    const result: ScanResult = {
      safe: filtered.length === 0,
      threats: filtered,
      maxSeverity: maxSeverity(filtered),
    };

    if (this.config.redactSecrets && filtered.length > 0) {
      result.redactedText = redactText(text, filtered);
    }

    return result;
  }
}
