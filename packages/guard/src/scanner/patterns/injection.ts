import type { ThreatCategory, Severity } from '../../types.js';

export interface InjectionPattern {
  id: string;
  category: ThreatCategory;
  severity: Severity;
  description: string;
  pattern: RegExp;
  /** Optional: compound logic that overrides pattern (returns matched excerpt or null) */
  custom?: (text: string) => string | null;
}

export const INJECTION_PATTERNS: InjectionPattern[] = [
  {
    id: 'inj_001',
    category: 'direct_injection',
    severity: 'high',
    description: 'Direct instruction override attempt',
    pattern: /ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|context)/i,
  },
  {
    id: 'inj_002',
    category: 'direct_injection',
    severity: 'high',
    description: 'Instruction disregard attempt',
    pattern: /disregard\s+(your\s+)?(instructions?|system\s+prompt|rules?)/i,
  },
  {
    id: 'inj_003',
    category: 'direct_injection',
    severity: 'medium',
    description: 'New instruction injection',
    pattern: /new\s+instructions?\s*[:\-]\s*\w/i,
  },
  {
    id: 'inj_004',
    category: 'direct_injection',
    severity: 'critical',
    description: 'System/instruction template token injection',
    pattern: /\[SYSTEM\]|\[INST\]|\[\/INST\]/i,
  },
  {
    id: 'inj_005',
    category: 'jailbreak',
    severity: 'critical',
    description: 'DAN/evil persona roleplay attempt',
    pattern: /(act|pretend|roleplay)\s+as\s+(DAN|evil|uncensored|unlimited|unfiltered)/i,
  },
  {
    id: 'inj_006',
    category: 'jailbreak',
    severity: 'critical',
    description: 'Jailbreak mode activation',
    pattern: /DAN\s*mode|jailbreak\s*mode|developer\s*mode\s+(enabled|on|activated)/i,
  },
  {
    id: 'inj_007',
    category: 'jailbreak',
    severity: 'high',
    description: 'Ethics/restrictions denial',
    pattern: /you\s+(have\s+no|don'?t\s+have)\s+(ethics|restrictions|guidelines|rules|limits)/i,
  },
  {
    id: 'inj_008',
    category: 'jailbreak',
    severity: 'high',
    description: 'Hypothetical/fictional framing of financial action',
    pattern: /(hypothetically|in\s+(?:a\s+)?fiction|in\s+this\s+scenario)[,\s].{0,80}(transfer|send|pay)/i,
  },
  {
    id: 'inj_009',
    category: 'encoding_evasion',
    severity: 'high',
    description: 'Base64 payload with decode instruction',
    custom: (text: string): string | null => {
      const b64 = /(?:[A-Za-z0-9+/]{4}){8,}={0,2}/g;
      const decodeKeyword = /\bdecode\b/i;
      let match: RegExpExecArray | null;
      while ((match = b64.exec(text)) !== null) {
        const surrounding = text.slice(Math.max(0, match.index - 100), match.index + match[0].length + 100);
        if (decodeKeyword.test(surrounding)) {
          return match[0].slice(0, 120);
        }
      }
      return null;
    },
    pattern: /(?:[A-Za-z0-9+/]{4}){8,}={0,2}/,
  },
  {
    id: 'inj_010',
    category: 'encoding_evasion',
    severity: 'critical',
    description: 'Unicode bidirectional override character',
    pattern: /[\u202e\u2066\u2067\u2068]/,
  },
  {
    id: 'inj_011',
    category: 'encoding_evasion',
    severity: 'medium',
    description: 'Hex-encoded instruction sequence',
    pattern: /(?:\\x[0-9a-f]{2}){10,}/i,
  },
  {
    id: 'inj_012',
    category: 'multi_turn_manipulation',
    severity: 'medium',
    description: 'Multi-turn continuation with role change',
    custom: (text: string): string | null => {
      const continuation = /(?:continue|resume|pick up)\s+(?:from|where|our)\s+(?:previous|last|prior|our)/i;
      const roleChange = /(?:you\s+(?:are|were)|act\s+as|pretend\s+to\s+be|your\s+(?:new\s+)?role)/i;
      const contMatch = continuation.exec(text);
      const roleMatch = roleChange.exec(text);
      if (contMatch && roleMatch) {
        const excerpt = text.slice(contMatch.index, contMatch.index + 120);
        return excerpt;
      }
      return null;
    },
    pattern: /continue\s+from\s+(?:previous|last|prior)/i,
  },
  {
    id: 'inj_013',
    category: 'multi_turn_manipulation',
    severity: 'medium',
    description: 'False memory injection via previous session claim',
    pattern: /previous\s+(conversation|session|exchange|context)\s+(said|told|instructed|specified|established)/i,
  },
  {
    id: 'inj_014',
    category: 'multi_turn_manipulation',
    severity: 'low',
    description: 'False prior instruction claim',
    pattern: /as\s+I\s+(told|said|mentioned|asked)\s+you\s+(before|earlier|previously|already)/i,
  },
  {
    id: 'inj_015',
    category: 'authority_escalation',
    severity: 'high',
    description: 'False authority claim (creator/platform)',
    pattern: /I\s+am\s+(your\s+)?(creator|anthropic|openai|google|admin|operator|developer|owner)/i,
  },
  {
    id: 'inj_016',
    category: 'authority_escalation',
    severity: 'critical',
    description: 'Safety/security override attempt',
    pattern: /(override|bypass|disable|circumvent|ignore)\s+(safety|security|policy|filter|guardrail|restrictions?|limitations?)/i,
  },
  {
    id: 'inj_017',
    category: 'indirect_injection',
    severity: 'high',
    description: 'HTML/script injection via markup tags',
    pattern: /<\s*(script|iframe|svg|object|embed|link|meta|base)\b[^>]*>/i,
  },
  {
    id: 'inj_018',
    category: 'indirect_injection',
    severity: 'high',
    description: 'Template/system tag injection',
    pattern: /\[system\]|\{\{system\}\}|\{%[-\s]*system/i,
  },
];

/** Patterns that must run on ORIGINAL text (before normalization) */
export const ENCODING_EVASION_IDS = new Set(['inj_009', 'inj_010', 'inj_011']);
