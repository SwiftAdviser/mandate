import type { MandateWallet, TransferResult } from '@mandate/sdk';
import type { MandateGuard } from '../scanner/MandateGuard.js';
import { InjectionBlockedError, SecretLeakError } from '../types.js';

/**
 * Drop-in MandateWallet proxy that runs injection and secret-leak scans
 * before/after every wallet operation.
 *
 * Usage:
 *   const wallet = new GuardedWallet(mandateWallet, new MandateGuard());
 *   await wallet.transfer(to, amount, token);  // throws InjectionBlockedError if unsafe
 */
export class GuardedWallet {
  constructor(
    private readonly wallet: MandateWallet,
    private readonly guard: MandateGuard,
  ) {}

  get address(): `0x${string}` {
    return this.wallet.address;
  }

  async transfer(
    to: `0x${string}`,
    rawAmount: string,
    tokenAddress: `0x${string}`,
    opts?: { waitForConfirmation?: boolean },
  ): Promise<TransferResult> {
    this.#checkInput(`transfer ${rawAmount} to ${to} token ${tokenAddress}`);
    return this.wallet.transfer(to, rawAmount, tokenAddress, opts);
  }

  async sendEth(
    to: `0x${string}`,
    valueWei: string,
    opts?: { waitForConfirmation?: boolean },
  ): Promise<TransferResult> {
    this.#checkInput(`sendEth ${valueWei} to ${to}`);
    return this.wallet.sendEth(to, valueWei, opts);
  }

  async sendTransaction(
    to: `0x${string}`,
    calldata: `0x${string}`,
    valueWei?: string,
    opts?: { waitForConfirmation?: boolean },
  ): Promise<TransferResult> {
    // NOTE: raw calldata excluded from scan — ABI hex causes false positives.
    // Only scan metadata: function selector + address + value + length.
    this.#checkInput(
      `sendTransaction to=${to} selector=${calldata.slice(0, 10)} valueWei=${valueWei ?? '0'} calldataLength=${calldata.length}`,
    );
    return this.wallet.sendTransaction(to, calldata, valueWei, opts);
  }

  async x402Pay(
    url: string,
    opts?: { headers?: Record<string, string> },
  ): Promise<Response> {
    this.#checkInput(`${url} ${JSON.stringify(opts?.headers ?? {})}`);
    const response = await this.wallet.x402Pay(url, opts);
    const body = await response.clone().text();
    this.#checkOutput(body);
    return response;
  }

  #checkInput(text: string): void {
    const result = this.guard.scanInput(text);
    if (!result.safe) throw new InjectionBlockedError(result.threats);
  }

  #checkOutput(text: string): void {
    const result = this.guard.scanOutput(text);
    if (!result.safe) throw new SecretLeakError(result.threats);
  }
}
