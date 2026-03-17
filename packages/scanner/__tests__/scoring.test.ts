import { describe, it, expect } from 'vitest';
import { computeRiskScore } from '../src/scoring.js';

describe('computeRiskScore', () => {
  it('returns 0 for mandate-protected agents', () => {
    expect(computeRiskScore(500_000, 100, Date.now() / 1000, true)).toBe(0);
  });

  it('returns 0 for zero activity', () => {
    expect(computeRiskScore(0, 0, 0, false)).toBe(0);
  });

  // Volume scoring
  it('scores $5K volume at 20 points', () => {
    const score = computeRiskScore(5_000, 0, 0, false);
    expect(score).toBe(20);
  });

  it('scores $10K volume at 27 points', () => {
    const score = computeRiskScore(10_000, 0, 0, false);
    expect(score).toBe(27);
  });

  it('scores $50K volume at 35 points', () => {
    const score = computeRiskScore(50_000, 0, 0, false);
    expect(score).toBe(35);
  });

  it('caps volume at 50 points for $500K+', () => {
    expect(computeRiskScore(500_000, 0, 0, false)).toBe(50);
    expect(computeRiskScore(1_000_000, 0, 0, false)).toBe(50);
  });

  it('scales linearly under $5K', () => {
    // $2500 = floor(2500/5000 * 20) = floor(10) = 10
    expect(computeRiskScore(2_500, 0, 0, false)).toBe(10);
    // $1000 = floor(1000/5000 * 20) = floor(4) = 4
    expect(computeRiskScore(1_000, 0, 0, false)).toBe(4);
  });

  // Frequency scoring
  it('scores 10+ tx at 10 points', () => {
    const score = computeRiskScore(0, 10, 0, false);
    expect(score).toBe(10);
  });

  it('scores 20+ tx at 20 points', () => {
    expect(computeRiskScore(0, 20, 0, false)).toBe(20);
  });

  it('scores 50+ tx at 30 points', () => {
    expect(computeRiskScore(0, 50, 0, false)).toBe(30);
    expect(computeRiskScore(0, 100, 0, false)).toBe(30);
  });

  it('scores <10 tx at 0 points', () => {
    expect(computeRiskScore(0, 9, 0, false)).toBe(0);
  });

  // Recency bonus
  it('adds 20 points for activity within last 24h', () => {
    const recentTs = Date.now() / 1000 - 3600; // 1 hour ago
    expect(computeRiskScore(0, 0, recentTs, false)).toBe(20);
  });

  it('no recency bonus for activity older than 24h', () => {
    const oldTs = Date.now() / 1000 - 100_000; // ~28 hours ago
    expect(computeRiskScore(0, 0, oldTs, false)).toBe(0);
  });

  // Combined
  it('sums all components for high-risk agent', () => {
    const recentTs = Date.now() / 1000 - 60;
    // $500K = 50, 50 tx = 30, recent = 20 → total 100
    expect(computeRiskScore(500_000, 50, recentTs, false)).toBe(100);
  });

  it('combined mid-range scoring', () => {
    const recentTs = Date.now() / 1000 - 60;
    // $10K = 27, 15 tx = 10, recent = 20 → total 57
    expect(computeRiskScore(10_000, 15, recentTs, false)).toBe(57);
  });
});
