/**
 * MandateWallet — high-level class for agent developers.
 *
 * Works ON TOP of viem (or any compatible signer).
 * Private key stays local — never sent to Mandate API.
 *
 * Compatible with: AgentKit (as action provider), GOAT SDK, Privy server wallets, raw viem.
 *
 * @example
 * const wallet = new MandateWallet({
 *   runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
 *   privateKey:  process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
 *   chainId: 84532,
 * });
 * const { txHash, status } = await wallet.transfer(recipientAddress, '10000000', USDC_BASE_SEPOLIA);
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  encodeFunctionData,
  type Hash,
  type TransactionReceipt,
  type WalletClient,
  type PublicClient,
  type Chain,
  type PrivateKeyAccount,
  privateKeyToAccount,
} from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { MandateClient } from './MandateClient.js';
import { computeIntentHash } from './intentHash.js';
import type { IntentStatus, MandateConfig } from './types.js';
import { ApprovalRequiredError } from './types.js';

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

const CHAINS: Record<number, Chain> = {
  84532: baseSepolia,
  8453:  base,
};

const DEFAULT_RPC: Record<number, string> = {
  84532: 'https://sepolia.base.org',
  8453:  'https://mainnet.base.org',
};

export interface MandateWalletConfig extends MandateConfig {
  /** Agent private key — stays local, never sent to API */
  privateKey: `0x${string}`;
  chainId: number;
  /** Optional: custom RPC URL */
  rpcUrl?: string;
}

export interface TransferResult {
  txHash: Hash;
  intentId: string;
  status: IntentStatus;
}

export class MandateWallet {
  private readonly client: MandateClient;
  private readonly wallet: WalletClient;
  private readonly publicClient: PublicClient;
  private readonly account: PrivateKeyAccount;
  private readonly chainId: number;

  constructor(config: MandateWalletConfig) {
    this.client       = new MandateClient(config);
    this.account      = privateKeyToAccount(config.privateKey);
    this.chainId      = config.chainId;
    const chain       = CHAINS[config.chainId];
    const rpcUrl      = config.rpcUrl ?? DEFAULT_RPC[config.chainId] ?? 'https://sepolia.base.org';

    this.wallet = createWalletClient({
      account:   this.account,
      chain,
      transport: http(rpcUrl),
    });

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  }

  get address(): `0x${string}` {
    return this.account.address;
  }

  /**
   * ERC20 transfer with full policy enforcement.
   * Throws PolicyBlockedError, CircuitBreakerError, or ApprovalRequiredError on rejection.
   */
  async transfer(
    to: `0x${string}`,
    rawAmount: string,
    tokenAddress: `0x${string}`,
    opts: { waitForConfirmation?: boolean } = {},
  ): Promise<TransferResult> {
    const calldata = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, BigInt(rawAmount)],
    });

    return this.sendTransaction(tokenAddress, calldata, '0', opts);
  }

  /**
   * Native ETH/MATIC transfer.
   */
  async sendEth(
    to: `0x${string}`,
    valueWei: string,
    opts: { waitForConfirmation?: boolean } = {},
  ): Promise<TransferResult> {
    return this.sendTransaction(to, '0x', valueWei, opts);
  }

  /**
   * General-purpose: build, validate, sign, broadcast.
   * Steps:
   *   1. Estimate gas + nonce
   *   2. Compute intentHash
   *   3. POST /api/validate (policy check)
   *   4. Sign + broadcast locally (private key never leaves)
   *   5. POST /api/intents/{id}/events (envelope verify)
   *   6. Optionally poll for confirmation
   */
  async sendTransaction(
    to: `0x${string}`,
    calldata: `0x${string}`,
    valueWei: string = '0',
    opts: { waitForConfirmation?: boolean } = {},
  ): Promise<TransferResult> {
    // 1. Fetch nonce + fee data
    const [nonce, feeData] = await Promise.all([
      this.publicClient.getTransactionCount({ address: this.account.address }),
      this.publicClient.estimateFeesPerGas(),
    ]);

    const maxFeePerGas         = feeData.maxFeePerGas?.toString()         ?? '1000000000';
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas?.toString() ?? '1000000000';

    // Estimate gas
    let gasLimit = '100000';
    try {
      const estimated = await this.publicClient.estimateGas({
        account: this.account.address,
        to,
        data:  calldata === '0x' ? undefined : calldata,
        value: BigInt(valueWei),
      });
      gasLimit = (estimated * 12n / 10n).toString(); // +20% buffer
    } catch {
      // Use default if estimation fails
    }

    // 2. Compute intentHash
    const intentHash = computeIntentHash({
      chainId: this.chainId,
      nonce,
      to,
      calldata,
      valueWei,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      txType: 2,
      accessList: [],
    });

    // 3. Validate (throws on block/CB/approval-required)
    const validation = await this.client.validate({
      chainId: this.chainId,
      nonce,
      to,
      calldata,
      valueWei,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      txType: 2,
      accessList: [],
      intentHash,
    });

    const intentId = validation.intentId!;

    // 4. Sign + broadcast locally (private key stays here)
    const txHash = await this.wallet.sendTransaction({
      to,
      data:                  calldata === '0x' ? undefined : calldata,
      value:                 BigInt(valueWei),
      gas:                   BigInt(gasLimit),
      maxFeePerGas:          BigInt(maxFeePerGas),
      maxPriorityFeePerGas:  BigInt(maxPriorityFeePerGas),
      nonce,
      type: 'eip1559',
    });

    // 5. Post txHash to Mandate (triggers envelope verification)
    await this.client.postEvent(intentId, txHash);

    // 6. Optionally wait for on-chain confirmation
    const status = opts.waitForConfirmation !== false
      ? await this.client.waitForConfirmation(intentId)
      : await this.client.getStatus(intentId);

    return { txHash, intentId, status };
  }

  /**
   * x402 payment flow.
   * 1. Fetch the target URL (expects 402 response)
   * 2. Parse X-Payment-Required header
   * 3. Validate + sign ERC20 transfer
   * 4. Retry original request with Payment-Signature header
   */
  async x402Pay(
    url: string,
    opts: { headers?: Record<string, string> } = {},
  ): Promise<Response> {
    // 1. Hit the paywall
    const probe = await fetch(url, { headers: opts.headers });

    if (probe.status !== 402) {
      return probe; // Already accessible
    }

    const paymentHeader = probe.headers.get('X-Payment-Required') ?? probe.headers.get('X-Payment-Info');
    if (!paymentHeader) throw new Error('402 response missing X-Payment-Required header');

    // 2. Parse payment requirements
    const payment = JSON.parse(paymentHeader) as {
      amount: string;
      currency: string;
      paymentAddress: `0x${string}`;
      chainId: number;
      tokenAddress?: `0x${string}`;
    };

    const tokenAddress = payment.tokenAddress ?? this.getDefaultUsdc(payment.chainId);

    // 3. Execute transfer via Mandate policy check
    const { txHash } = await this.transfer(
      payment.paymentAddress,
      payment.amount,
      tokenAddress,
    );

    // 4. Retry with payment proof
    return fetch(url, {
      headers: {
        ...opts.headers,
        'Payment-Signature': txHash,
        'X-Payment-TxHash':  txHash,
      },
    });
  }

  private getDefaultUsdc(chainId: number): `0x${string}` {
    const USDC: Record<number, `0x${string}`> = {
      84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      8453:  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    };
    return USDC[chainId] ?? USDC[84532];
  }
}
