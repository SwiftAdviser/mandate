/**
 * MandateAcpClient — ACP client with Mandate policy enforcement.
 *
 * Integration point: when an ACP job reaches NEGOTIATION phase,
 * paymentRequestData.budget.usdValue is available. Before calling
 * approvePayment(), we validate this USD spend against Mandate policy.
 *
 * Since ACP payments go through ACP's own smart wallet (not via direct
 * EVM tx signing), we validate with a synthetic payload using the USDC
 * token amount derived from the USD value (1 USDC = 1 USD = 1_000_000 units).
 */

import { AcpClient } from './acpClient.js';
import { MandateClient, PolicyBlockedError, ApprovalRequiredError } from '@mandate/sdk';
import type {
  MandateAcpConfig, AcpJob, CreateJobResult,
  JobPayResult, CreateAndPayResult,
} from './types.js';

// Base Sepolia USDC — used as synthetic token for Mandate validation
const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`;
const USDC_DECIMALS = 6;
const CHAIN_ID = 84532; // Base Sepolia

export class MandateAcpClient {
  private readonly acp: AcpClient;
  private readonly mandate: MandateClient;

  constructor(config: MandateAcpConfig) {
    this.acp     = new AcpClient(config);
    this.mandate = new MandateClient({
      runtimeKey: config.mandateRuntimeKey,
      baseUrl:    config.mandateApiUrl,
    });
  }

  // ── Passthrough: non-payment ACP operations ───────────────────────────
  search(query: string, topK?: number) { return this.acp.search(query, topK); }
  getMyInfo()                           { return this.acp.getMyInfo(); }
  getJobStatus(jobId: number)           { return this.acp.getJobStatus(jobId); }

  // ── Core: policy-enforced job creation ───────────────────────────────

  /**
   * Create an ACP job without automatic payment.
   * Returns jobId — caller handles negotiation separately via payJob().
   */
  async createJob(
    providerWalletAddress: string,
    jobOfferingName: string,
    serviceRequirements: Record<string, unknown> = {},
  ): Promise<CreateJobResult> {
    return this.acp.createJob(
      providerWalletAddress,
      jobOfferingName,
      serviceRequirements,
      false, // isAutomated = false: we handle negotiation with Mandate
    );
  }

  /**
   * Validate with Mandate and approve/reject an ACP job payment.
   *
   * - Fetches current job status to extract paymentRequestData.
   * - Validates the USD spend against Mandate policy.
   * - On allowed: calls approvePayment(jobId, true).
   * - On blocked: calls approvePayment(jobId, false) and returns blocked=true.
   * - On approval required: returns requiresApproval=true without paying.
   */
  async payJob(
    jobId: number,
    opts: { content?: string; rejectContent?: string } = {},
  ): Promise<JobPayResult> {
    const job = await this.acp.getJobStatus(jobId);

    if (job.phase !== 'NEGOTIATION') {
      throw new Error(
        `Job ${jobId} is in phase "${job.phase}", not NEGOTIATION. Cannot pay.`,
      );
    }

    const usdValue = this.extractUsdValue(job);

    try {
      await this.validateSpend(
        usdValue,
        job.providerWalletAddress ?? '0x0000000000000000000000000000000000000000',
      );
    } catch (err) {
      if (err instanceof PolicyBlockedError) {
        await this.acp.approvePayment(
          jobId,
          false,
          opts.rejectContent ?? `Rejected by Mandate policy: ${err.blockReason}`,
        );
        return { jobId, accepted: false, blocked: true, blockReason: err.blockReason };
      }
      if (err instanceof ApprovalRequiredError) {
        return {
          jobId,
          accepted: false,
          blocked: false,
          requiresApproval: true,
          blockReason: 'approval_required',
        };
      }
      throw err;
    }

    await this.acp.approvePayment(jobId, true, opts.content);
    return { jobId, accepted: true, blocked: false };
  }

  /**
   * Full flow: create job → poll until NEGOTIATION → validate with Mandate → pay.
   * Convenience method for automated agents.
   */
  async createAndPay(
    providerWalletAddress: string,
    jobOfferingName: string,
    serviceRequirements: Record<string, unknown> = {},
    opts: {
      pollTimeoutMs?: number;
      pollIntervalMs?: number;
      content?: string;
    } = {},
  ): Promise<CreateAndPayResult> {
    const { jobId } = await this.createJob(
      providerWalletAddress,
      jobOfferingName,
      serviceRequirements,
    );

    // Poll until NEGOTIATION (or terminal phase)
    const job = await this.acp.pollUntilPhaseChanges(jobId, 'REQUEST', {
      timeoutMs:  opts.pollTimeoutMs,
      intervalMs: opts.pollIntervalMs,
    });

    if (job.phase !== 'NEGOTIATION') {
      // Job went to a terminal phase without negotiation (e.g., auto-rejected)
      return {
        jobId,
        accepted: false,
        blocked: false,
        phase: job.phase,
      };
    }

    const payResult = await this.payJob(jobId, { content: opts.content });

    return {
      jobId,
      accepted: payResult.accepted,
      blocked: payResult.blocked,
      blockReason: payResult.blockReason,
      phase: job.phase,
    };
  }

  // ── Internal ──────────────────────────────────────────────────────────

  /**
   * Validate a USD spend amount with Mandate.
   * Uses a synthetic ERC20 transfer payload (USDC on Base Sepolia).
   * Throws PolicyBlockedError or ApprovalRequiredError on rejection.
   */
  private async validateSpend(
    usdValue: number,
    providerWallet: string,
  ): Promise<void> {
    // Convert USD → raw USDC units (1 USD ≈ 1 USDC, 6 decimals)
    const rawAmount = BigInt(Math.ceil(usdValue * 10 ** USDC_DECIMALS));

    // ERC20 transfer(address,uint256) selector: 0xa9059cbb
    const toHex = (addr: string) => addr.toLowerCase().padStart(64, '0');
    const amtHex = rawAmount.toString(16).padStart(64, '0');
    const calldata = `0xa9059cbb${toHex(providerWallet.slice(2))}${amtHex}` as `0x${string}`;

    // intentHash — placeholder (Mandate server recomputes from payload fields)
    const intentHash = '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`;

    await this.mandate.validate({
      chainId:              CHAIN_ID,
      nonce:                0,
      to:                   USDC_BASE_SEPOLIA,
      calldata,
      valueWei:             '0',
      gasLimit:             '100000',
      maxFeePerGas:         '1000000000',
      maxPriorityFeePerGas: '1000000000',
      txType:               2,
      accessList:           [],
      intentHash,
    });
  }

  private extractUsdValue(job: AcpJob): number {
    const prd = job.paymentRequestData;
    if (!prd) {
      throw new Error(`Job ${job.jobId} has no paymentRequestData in NEGOTIATION phase`);
    }
    const budgetUsd   = prd.budget?.usdValue   ?? 0;
    const transferUsd = prd.transfer?.usdValue ?? 0;
    return budgetUsd + transferUsd;
  }
}
