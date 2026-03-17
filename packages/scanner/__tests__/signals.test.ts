import { describe, it, expect } from 'vitest';
import { inferFramework } from '../src/signals.js';

describe('inferFramework', () => {
  it('returns "registered" for registered agents regardless of type', () => {
    expect(inferFramework('eoa_agent', true)).toBe('registered');
    expect(inferFramework('service_contract', true)).toBe('registered');
    expect(inferFramework('unknown', true)).toBe('registered');
  });

  it('returns "service_contract" for unregistered contracts', () => {
    expect(inferFramework('service_contract', false)).toBe('service_contract');
  });

  it('returns "unknown" for unregistered EOAs', () => {
    expect(inferFramework('eoa_agent', false)).toBe('unknown');
  });

  it('returns "unknown" for unknown type unregistered', () => {
    expect(inferFramework('unknown', false)).toBe('unknown');
  });
});
