import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MandateGuard } from '../scanner/MandateGuard.js';
import { GuardedWallet } from '../wallet/GuardedWallet.js';
import { InjectionBlockedError, SecretLeakError } from '../types.js';
import type { MandateWallet, TransferResult } from '@mandate/sdk';

// Minimal mock matching the MandateWallet surface used by GuardedWallet
function makeMockWallet(overrides: Partial<MandateWallet> = {}): MandateWallet {
  const address = '0xDeadBeef00000000000000000000000000000001' as `0x${string}`;
  const txResult: TransferResult = {
    txHash: '0xabc' as `0x${string}`,
    intentId: 'intent-1',
    status: {
      intentId: 'intent-1',
      status: 'confirmed',
      txHash: '0xabc',
      blockNumber: null,
      gasUsed: null,
      amountUsd: null,
      decodedAction: null,
      blockReason: null,
      requiresApproval: false,
      approvalId: null,
      expiresAt: null,
    },
  };
  return {
    get address() { return address; },
    transfer: vi.fn().mockResolvedValue(txResult),
    sendEth: vi.fn().mockResolvedValue(txResult),
    sendTransaction: vi.fn().mockResolvedValue(txResult),
    x402Pay: vi.fn().mockResolvedValue(
      new Response('{"ok":true}', { status: 200 }),
    ),
    ...overrides,
  } as unknown as MandateWallet;
}

describe('GuardedWallet', () => {
  let mockWallet: MandateWallet;
  let guard: MandateGuard;
  let wallet: GuardedWallet;

  beforeEach(() => {
    mockWallet = makeMockWallet();
    guard = new MandateGuard();
    wallet = new GuardedWallet(mockWallet, guard);
  });

  describe('address getter', () => {
    it('proxies address from underlying wallet', () => {
      expect(wallet.address).toBe('0xDeadBeef00000000000000000000000000000001');
      expect(wallet.address).toBe(mockWallet.address);
    });
  });

  describe('transfer', () => {
    it('passes through on clean input', async () => {
      const result = await wallet.transfer(
        '0xRecipient0000000000000000000000000001' as `0x${string}`,
        '1000000',
        '0xTokenAddr0000000000000000000000000001' as `0x${string}`,
      );
      expect(result.txHash).toBe('0xabc');
      expect(mockWallet.transfer).toHaveBeenCalledOnce();
    });

    it('throws InjectionBlockedError on injection in parameters', async () => {
      // Craft a "to" address lookalike that triggers inj_015
      const guard2 = new MandateGuard();
      const spyInput = vi.spyOn(guard2, 'scanInput').mockReturnValueOnce({
        safe: false,
        threats: [{ patternId: 'inj_001', category: 'direct_injection', severity: 'high', description: 'test', matchedText: 'ignore previous', matchedTextRedacted: false }],
        maxSeverity: 'high',
      });
      const w2 = new GuardedWallet(mockWallet, guard2);
      await expect(w2.transfer(
        '0xRecipient0000000000000000000000000001' as `0x${string}`,
        '1000',
        '0xToken00000000000000000000000000000001' as `0x${string}`,
      )).rejects.toThrow(InjectionBlockedError);
      spyInput.mockRestore();
    });
  });

  describe('sendEth', () => {
    it('passes through on clean input', async () => {
      const result = await wallet.sendEth(
        '0xRecipient0000000000000000000000000001' as `0x${string}`,
        '1000000000000000000',
      );
      expect(result.txHash).toBe('0xabc');
      expect(mockWallet.sendEth).toHaveBeenCalledOnce();
    });

    it('throws InjectionBlockedError when guard flags input', async () => {
      const guard2 = new MandateGuard();
      vi.spyOn(guard2, 'scanInput').mockReturnValueOnce({
        safe: false,
        threats: [{ patternId: 'inj_001', category: 'direct_injection', severity: 'high', description: 'test', matchedText: 'test', matchedTextRedacted: false }],
        maxSeverity: 'high',
      });
      const w2 = new GuardedWallet(mockWallet, guard2);
      await expect(w2.sendEth('0xRecipient0000000000000000000000000001' as `0x${string}`, '1000')).rejects.toThrow(InjectionBlockedError);
    });
  });

  describe('sendTransaction', () => {
    it('passes through real ERC-20 calldata without false-positive', async () => {
      // Real ERC-20 transfer calldata — ABI-encoded, hex-dense
      const erc20Calldata = '0xa9059cbb000000000000000000000000deadbeef00000000000000000000000000000001000000000000000000000000000000000000000000000000000000003b9aca00' as `0x${string}`;
      const result = await wallet.sendTransaction(
        '0xTokenAddr0000000000000000000000000001' as `0x${string}`,
        erc20Calldata,
        '0',
      );
      expect(result.txHash).toBe('0xabc');
      expect(mockWallet.sendTransaction).toHaveBeenCalledOnce();
    });

    it('scans only selector + metadata, not full calldata', async () => {
      const scanSpy = vi.spyOn(guard, 'scanInput');
      await wallet.sendTransaction(
        '0xTokenAddr0000000000000000000000000001' as `0x${string}`,
        '0xa9059cbbdeadbeef' as `0x${string}`,
        '0',
      );
      const scannedText = scanSpy.mock.calls[0][0];
      // Should contain selector (first 10 chars of calldata), not full calldata
      expect(scannedText).toContain('selector=0xa9059cbb');
      expect(scannedText).toContain('calldataLength=');
      // Should NOT contain the full calldata body
      expect(scannedText).not.toContain('deadbeef');
    });
  });

  describe('x402Pay', () => {
    it('passes through on clean URL and response body', async () => {
      const response = await wallet.x402Pay('https://api.example.com/resource');
      const body = await response.text();
      expect(body).toBe('{"ok":true}');
      expect(mockWallet.x402Pay).toHaveBeenCalledOnce();
    });

    it('original response stream is still readable after x402Pay', async () => {
      const response = await wallet.x402Pay('https://api.example.com/resource');
      // response.body should be unconsumed — text() should work
      const text = await response.text();
      expect(text).toBe('{"ok":true}');
    });

    it('throws SecretLeakError when response body contains API key', async () => {
      const mockWithSecret = makeMockWallet({
        x402Pay: vi.fn().mockResolvedValue(
          new Response('Your key is sk-abcdefghijklmnopqrst1234', { status: 200 }),
        ),
      });
      const w2 = new GuardedWallet(mockWithSecret, new MandateGuard());
      await expect(w2.x402Pay('https://api.example.com/paid')).rejects.toThrow(SecretLeakError);
    });

    it('throws InjectionBlockedError on injection in URL', async () => {
      const guard2 = new MandateGuard();
      vi.spyOn(guard2, 'scanInput').mockReturnValueOnce({
        safe: false,
        threats: [{ patternId: 'inj_001', category: 'direct_injection', severity: 'high', description: 'test', matchedText: 'test', matchedTextRedacted: false }],
        maxSeverity: 'high',
      });
      const w2 = new GuardedWallet(mockWallet, guard2);
      await expect(w2.x402Pay('https://evil.com/[SYSTEM]')).rejects.toThrow(InjectionBlockedError);
    });
  });
});
