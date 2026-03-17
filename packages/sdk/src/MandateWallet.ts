/**
 * MandateWallet — policy enforcement wrapper for YOUR wallet.
 *
 * NOT a custodial wallet. Mandate never receives your private key.
 * Your key stays local. Mandate validates intent metadata against your policy
 * BEFORE you sign and broadcast.
 *
 * Like a corporate card with spending rules — your money, our guardrails.
 *
 * Also exported as `MandateGuard` if you prefer clearer naming.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  type Hash,
  type WalletClient,
  type PublicClient,
  type Chain,
  type PrivateKeyAccount,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, base } from 'viem/chains';
import { MandateClient } from './MandateClient.js';
import { computeIntentHash } from './intentHash.js';
import { ApprovalRequiredError } from './types.js';
import type { IntentStatus, IntentPayload, MandateConfig, ExternalSigner } from './types.js';

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
  chainId: number;
  /** Variant 1: raw private key (current behavior) */
  privateKey?: `0x${string}`;
  /** Variant 2: external signer (any wallet that can send txs) */
  signer?: ExternalSigner;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly wallet?: WalletClient<any, Chain, PrivateKeyAccount>;
  private readonly publicClient: PublicClient;
  private readonly account?: PrivateKeyAccount;
  private readonly externalSigner?: ExternalSigner;
  private readonly chainId: number;
  private cachedAddress?: `0x${string}`;

  constructor(config: MandateWalletConfig) {
    if (!config.privateKey && !config.signer) {
      throw new Error('MandateWalletConfig requires either privateKey or signer');
    }

    this.client  = new MandateClient(config);
    this.chainId = config.chainId;
    const chain  = CHAINS[config.chainId];
    const rpcUrl = config.rpcUrl ?? DEFAULT_RPC[config.chainId] ?? 'https://sepolia.base.org';

    if (config.privateKey) {
      this.account = privateKeyToAccount(config.privateKey);
      this.wallet  = createWalletClient({
        account:   this.account,
        chain,
        transport: http(rpcUrl),
      });
    } else if (config.signer) {
      this.externalSigner = config.signer;
      const addrResult = config.signer.getAddress();
      if (typeof addrResult === 'string') {
        this.cachedAddress = addrResult;
      }
    }

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  }

  get address(): `0x${string}` {
    if (this.account) return this.account.address;
    if (this.cachedAddress) return this.cachedAddress;
    throw new Error('Address not yet resolved. Use getAddress() for external signers.');
  }

  async getAddress(): Promise<`0x${string}`> {
    if (this.account) return this.account.address;
    if (this.cachedAddress) return this.cachedAddress;
    if (this.externalSigner) {
      this.cachedAddress = await this.externalSigner.getAddress();
      return this.cachedAddress;
    }
    throw new Error('No signer or private key configured');
  }

  /**
   * ERC20 transfer with full policy enforcement.
   * Throws PolicyBlockedError, CircuitBreakerError, or ApprovalRequiredError on rejection.
   */
  async transfer(
    to: `0x${string}`,
    rawAmount: string,
    tokenAddress: `0x${string}`,
    opts: { waitForConfirmation?: boolean; reason?: string } = {},
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
    opts: { waitForConfirmation?: boolean; reason?: string } = {},
  ): Promise<TransferResult> {
    return this.sendTransaction(to, '0x', valueWei, opts);
  }

  /**
   * General-purpose: build, validate, sign, broadcast.
   */
  async sendTransaction(
    to: `0x${string}`,
    calldata: `0x${string}`,
    valueWei: string = '0',
    opts: { waitForConfirmation?: boolean; reason?: string } = {},
  ): Promise<TransferResult> {
    const prepared = await this.prepareTransaction(to, calldata, valueWei, opts.reason ?? 'No reason provided');

    const validation = await this.client.validate(prepared.payload);
    const intentId = validation.intentId!;

    return this.signBroadcastConfirm(intentId, to, calldata, valueWei, prepared, opts);
  }

  /**
   * Like sendTransaction, but catches ApprovalRequiredError and waits for human decision.
   */
  async sendTransactionWithApproval(
    to: `0x${string}`,
    calldata: `0x${string}`,
    valueWei: string = '0',
    opts: {
      waitForConfirmation?: boolean;
      reason?: string;
      approvalTimeoutMs?: number;
      onApprovalPending?: (intentId: string, approvalId: string) => void;
      onApprovalPoll?: (status: IntentStatus) => void;
    } = {},
  ): Promise<TransferResult> {
    const prepared = await this.prepareTransaction(to, calldata, valueWei, opts.reason ?? 'No reason provided');

    let intentId: string;

    try {
      const validation = await this.client.validate(prepared.payload);
      intentId = validation.intentId!;
    } catch (err) {
      if (!(err instanceof ApprovalRequiredError)) throw err;

      intentId = err.intentId;
      opts.onApprovalPending?.(err.intentId, err.approvalId);

      await this.client.waitForApproval(intentId, {
        timeoutMs: opts.approvalTimeoutMs,
        onPoll: opts.onApprovalPoll,
      });
    }

    return this.signBroadcastConfirm(intentId, to, calldata, valueWei, prepared, opts);
  }

  /**
   * ERC20 transfer with approval wait support.
   */
  async transferWithApproval(
    to: `0x${string}`,
    rawAmount: string,
    tokenAddress: `0x${string}`,
    opts: Parameters<MandateWallet['sendTransactionWithApproval']>[3] = {},
  ): Promise<TransferResult> {
    const calldata = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, BigInt(rawAmount)],
    });

    return this.sendTransactionWithApproval(tokenAddress, calldata, '0', opts);
  }

  private async prepareTransaction(
    to: `0x${string}`,
    calldata: `0x${string}`,
    valueWei: string,
    reason: string = 'No reason provided',
  ): Promise<{
    nonce: number;
    gasLimit: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    intentHash: `0x${string}`;
    payload: IntentPayload;
  }> {
    const senderAddress = await this.getAddress();

    const [nonce, feeData] = await Promise.all([
      this.publicClient.getTransactionCount({ address: senderAddress }),
      this.publicClient.estimateFeesPerGas(),
    ]);

    const maxFeePerGas         = feeData.maxFeePerGas?.toString()         ?? '1000000000';
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas?.toString() ?? '1000000000';

    let gasLimit = '100000';
    try {
      const estimated = await this.publicClient.estimateGas({
        account: senderAddress,
        to,
        data:  calldata === '0x' ? undefined : calldata,
        value: BigInt(valueWei),
      });
      gasLimit = (estimated * 12n / 10n).toString();
    } catch {
      // Use default if estimation fails
    }

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

    const payload: IntentPayload = {
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
      reason,
    };

    return { nonce, gasLimit, maxFeePerGas, maxPriorityFeePerGas, intentHash, payload };
  }

  private async signBroadcastConfirm(
    intentId: string,
    to: `0x${string}`,
    calldata: `0x${string}`,
    valueWei: string,
    prepared: Awaited<ReturnType<MandateWallet['prepareTransaction']>>,
    opts: { waitForConfirmation?: boolean },
  ): Promise<TransferResult> {
    let txHash: Hash;

    if (this.externalSigner) {
      txHash = await this.externalSigner.sendTransaction({
        to,
        data: calldata === '0x' ? '0x' as `0x${string}` : calldata,
        value: BigInt(valueWei),
        gas: BigInt(prepared.gasLimit),
        maxFeePerGas: BigInt(prepared.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(prepared.maxPriorityFeePerGas),
        nonce: prepared.nonce,
      });
    } else {
      txHash = await this.wallet!.sendTransaction({
        account:               this.account!,
        to,
        data:                  calldata === '0x' ? undefined : calldata,
        value:                 BigInt(valueWei),
        gas:                   BigInt(prepared.gasLimit),
        maxFeePerGas:          BigInt(prepared.maxFeePerGas),
        maxPriorityFeePerGas:  BigInt(prepared.maxPriorityFeePerGas),
        nonce:                 prepared.nonce,
      } as Parameters<typeof this.wallet.sendTransaction>[0]);
    }

    await this.client.postEvent(intentId, txHash);

    const status = opts.waitForConfirmation !== false
      ? await this.client.waitForConfirmation(intentId)
      : await this.client.getStatus(intentId);

    return { txHash, intentId, status };
  }

  /**
   * x402 payment flow.
   */
  async x402Pay(
    url: string,
    opts: { headers?: Record<string, string>; reason?: string } = {},
  ): Promise<Response> {
    const probe = await fetch(url, { headers: opts.headers });

    if (probe.status !== 402) {
      return probe;
    }

    const paymentHeader = probe.headers.get('X-Payment-Required') ?? probe.headers.get('X-Payment-Info');
    if (!paymentHeader) throw new Error('402 response missing X-Payment-Required header');

    const payment = JSON.parse(paymentHeader) as {
      amount: string;
      currency: string;
      paymentAddress: `0x${string}`;
      chainId: number;
      tokenAddress?: `0x${string}`;
    };

    const tokenAddress = payment.tokenAddress ?? this.getDefaultUsdc(payment.chainId);

    const { txHash } = await this.transfer(
      payment.paymentAddress,
      payment.amount,
      tokenAddress,
      { reason: opts.reason ?? `x402 payment for ${url}` },
    );

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
