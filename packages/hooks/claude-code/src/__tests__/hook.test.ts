import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the core decision logic extracted as a helper function
// since the actual hook is a bash script

describe('mandate hook decision logic', () => {
  const PAYMENT_TOOLS = /^(Bash|mcp__.*transfer.*|mcp__.*payment.*)$/i;
  const PAYMENT_KEYWORDS = /\b(transfer|pay|send|0x[0-9a-fA-F]{40})\b/i;

  function shouldIntercept(toolName: string, toolInput: unknown): boolean {
    if (!PAYMENT_TOOLS.test(toolName)) return false;
    // For Bash: only intercept if the command contains payment-related keywords
    // For named MCP payment/transfer tools: the tool name itself is the signal — always intercept
    if (/^Bash$/i.test(toolName)) {
      return PAYMENT_KEYWORDS.test(JSON.stringify(toolInput));
    }
    return true;
  }

  it('intercepts Bash with transfer keyword', () => {
    expect(shouldIntercept('Bash', { command: 'transfer 100 USDC to 0xAbc' })).toBe(true);
  });

  it('does not intercept Read tool', () => {
    expect(shouldIntercept('Read', { file_path: '/tmp/test.txt' })).toBe(false);
  });

  it('does not intercept Bash without payment keywords', () => {
    expect(shouldIntercept('Bash', { command: 'ls -la' })).toBe(false);
  });

  it('intercepts mcp transfer tool', () => {
    expect(shouldIntercept('mcp__wallet__transfer', {})).toBe(true);
  });

  it('intercepts Bash with send keyword', () => {
    expect(shouldIntercept('Bash', { command: 'send 0.1 ETH' })).toBe(true);
  });

  it('intercepts Bash with a full 0x address', () => {
    expect(
      shouldIntercept('Bash', { command: 'cast send 0xAbC1234567890123456789012345678901234abcd --value 1ether' })
    ).toBe(true);
  });

  it('intercepts mcp payment tool regardless of input', () => {
    expect(shouldIntercept('mcp__stripe__payment', {})).toBe(true);
  });

  it('does not intercept Write tool', () => {
    expect(shouldIntercept('Write', { file_path: '/tmp/out.txt', content: 'hello' })).toBe(false);
  });
});
