import { describe, it, expect } from 'vitest';
import { computeIntentHash } from '../intentHash.js';

const BASE_INPUT = {
  chainId: 84532,
  nonce: 0,
  to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  calldata: '0xa9059cbb000000000000000000000000abcdef1234567890abcdef1234567890abcdef120000000000000000000000000000000000000000000000000000000000989680' as `0x${string}`,
  valueWei: '0',
  gasLimit: '100000',
  maxFeePerGas: '1000000000',
  maxPriorityFeePerGas: '1000000000',
  txType: 2,
  accessList: [],
};

describe('computeIntentHash', () => {
  it('returns a 0x-prefixed 32-byte hex string', () => {
    const hash = computeIntentHash(BASE_INPUT);
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('is deterministic — same input produces same hash', () => {
    const h1 = computeIntentHash(BASE_INPUT);
    const h2 = computeIntentHash(BASE_INPUT);
    expect(h1).toBe(h2);
  });

  it('changes when chainId changes', () => {
    const h1 = computeIntentHash(BASE_INPUT);
    const h2 = computeIntentHash({ ...BASE_INPUT, chainId: 8453 });
    expect(h1).not.toBe(h2);
  });

  it('changes when nonce changes', () => {
    const h1 = computeIntentHash(BASE_INPUT);
    const h2 = computeIntentHash({ ...BASE_INPUT, nonce: 1 });
    expect(h1).not.toBe(h2);
  });

  it('changes when to address changes', () => {
    const h1 = computeIntentHash(BASE_INPUT);
    const h2 = computeIntentHash({ ...BASE_INPUT, to: '0x0000000000000000000000000000000000000001' as `0x${string}` });
    expect(h1).not.toBe(h2);
  });

  it('changes when calldata changes', () => {
    const h1 = computeIntentHash(BASE_INPUT);
    const h2 = computeIntentHash({ ...BASE_INPUT, calldata: '0x' as `0x${string}` });
    expect(h1).not.toBe(h2);
  });

  it('changes when valueWei changes', () => {
    const h1 = computeIntentHash(BASE_INPUT);
    const h2 = computeIntentHash({ ...BASE_INPUT, valueWei: '1000000000000000000' });
    expect(h1).not.toBe(h2);
  });

  it('changes when gasLimit changes', () => {
    const h1 = computeIntentHash(BASE_INPUT);
    const h2 = computeIntentHash({ ...BASE_INPUT, gasLimit: '200000' });
    expect(h1).not.toBe(h2);
  });

  it('uses default txType=2 when omitted', () => {
    const withDefault = computeIntentHash({ ...BASE_INPUT, txType: undefined });
    const withExplicit = computeIntentHash({ ...BASE_INPUT, txType: 2 });
    expect(withDefault).toBe(withExplicit);
  });

  it('uses empty accessList by default', () => {
    const withDefault = computeIntentHash({ ...BASE_INPUT, accessList: undefined });
    const withExplicit = computeIntentHash({ ...BASE_INPUT, accessList: [] });
    expect(withDefault).toBe(withExplicit);
  });

  it('to address is lowercased before hashing', () => {
    const lower = computeIntentHash({ ...BASE_INPUT, to: '0x036cbd53842c5426634e7929541ec2318f3dcf7e' as `0x${string}` });
    const mixed = computeIntentHash({ ...BASE_INPUT, to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}` });
    expect(lower).toBe(mixed);
  });
});
