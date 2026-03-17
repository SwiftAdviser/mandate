export interface ScoredAgent {
  rank:            number;
  address:         string;
  chain:           string;
  volumeUsd7d:     number;
  txCount7d:       number;
  type:            'eoa_agent' | 'service_contract' | 'unknown';
  frameworkHint:   string;
  erc8004Name?:    string;
  erc8004Mcp?:     string;
  erc8004A2a?:     string;
  erc8004Web?:     string;
  erc8004Email?:   string;
  mandateProtected: boolean;
  riskScore:       number;
  lastSeenAt:      number;
}

/** Log-scaled volume score: $5K → 20pts, $50K → 35pts, $500K → 50pts */
function volumeScore(usd: number): number {
  if (usd <= 0)        return 0;
  if (usd >= 500_000)  return 50;
  if (usd >= 50_000)   return 35;
  if (usd >= 10_000)   return 27;
  if (usd >= 5_000)    return 20;
  return Math.floor(usd / 5_000 * 20);
}

/** Frequency score: >50 tx/7d → 30pts, >20 → 20pts, >10 → 10pts */
function frequencyScore(txCount: number): number {
  if (txCount >= 50) return 30;
  if (txCount >= 20) return 20;
  if (txCount >= 10) return 10;
  return 0;
}

/** Recency bonus: active in last 24h → +20pts */
function recencyBonus(lastSeenAt: number): number {
  const oneDayAgo = Date.now() / 1000 - 86_400;
  return lastSeenAt >= oneDayAgo ? 20 : 0;
}

export function computeRiskScore(
  volumeUsd7d:      number,
  txCount7d:        number,
  lastSeenAt:       number,
  mandateProtected: boolean,
): number {
  if (mandateProtected) return 0;
  return volumeScore(volumeUsd7d) + frequencyScore(txCount7d) + recencyBonus(lastSeenAt);
}
