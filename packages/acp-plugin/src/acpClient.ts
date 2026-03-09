/**
 * Minimal ACP API client — no dependency on the openclaw-acp CLI package.
 * Mirrors the axios client in openclaw-acp/src/lib/client.ts.
 */

import type {
  AcpConfig, AcpJob, AgentInfo, CreateJobResult,
} from './types.js';

const DEFAULT_ACP_URL = 'https://claw-api.virtuals.io';
const SEARCH_URL = 'https://acpx.virtuals.io/api/agents/v5/search';

export class AcpClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: AcpConfig) {
    this.baseUrl = (config.acpApiUrl ?? DEFAULT_ACP_URL).replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': config.acpApiKey,
      ...(config.builderCode ? { 'x-builder-code': config.builderCode } : {}),
    };
  }

  // ── Agent info ────────────────────────────────────────────────────────
  async getMyInfo(): Promise<AgentInfo> {
    const res = await this.get('/acp/me');
    return res.data;
  }

  // ── Search ────────────────────────────────────────────────────────────
  async search(query: string, topK = 5): Promise<AgentInfo[]> {
    const url = new URL(SEARCH_URL);
    url.searchParams.set('query', query);
    url.searchParams.set('claw', 'true');
    url.searchParams.set('topK', String(topK));
    url.searchParams.set('searchMode', 'hybrid');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`ACP search failed: ${res.status}`);
    const data = await res.json() as { data: AgentInfo[] };
    return data.data ?? [];
  }

  // ── Jobs ──────────────────────────────────────────────────────────────
  async createJob(
    providerWalletAddress: string,
    jobOfferingName: string,
    serviceRequirements: Record<string, unknown> = {},
    isAutomated = false,
  ): Promise<CreateJobResult> {
    const res = await this.post('/acp/jobs', {
      providerWalletAddress,
      jobOfferingName,
      serviceRequirements,
      isAutomated,
    });
    return { jobId: res.data?.jobId ?? res.jobId };
  }

  async getJobStatus(jobId: number): Promise<AcpJob> {
    const res = await this.get(`/acp/jobs/${jobId}`);
    const d = res.data ?? res;
    return {
      jobId: d.id ?? jobId,
      phase: d.phase,
      providerName: d.providerName ?? null,
      providerWalletAddress: d.providerAddress ?? null,
      clientName: d.clientName ?? null,
      clientWalletAddress: d.clientAddress ?? null,
      paymentRequestData: d.paymentRequestData ?? null,
      deliverable: d.deliverable ?? null,
      memoHistory: (d.memos ?? []).map((m: Record<string, unknown>) => ({
        nextPhase: m.nextPhase,
        content: m.content,
        createdAt: m.createdAt,
        status: m.status,
      })),
      expiry: d.expiry ?? null,
    };
  }

  async approvePayment(
    jobId: number,
    accept: boolean,
    content?: string,
  ): Promise<void> {
    await this.post(`/acp/providers/jobs/${jobId}/negotiation`, {
      accept,
      ...(content ? { content } : {}),
    });
  }

  /** Poll job status until it leaves a given phase. Returns new status. */
  async pollUntilPhaseChanges(
    jobId: number,
    fromPhase: string,
    opts: { timeoutMs?: number; intervalMs?: number } = {},
  ): Promise<AcpJob> {
    const timeout  = opts.timeoutMs  ?? 5 * 60 * 1000; // 5 min
    const interval = opts.intervalMs ?? 5_000;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const job = await this.getJobStatus(jobId);
      if (job.phase !== fromPhase) return job;
      await sleep(interval);
    }
    throw new Error(`Timeout waiting for job ${jobId} to leave phase "${fromPhase}"`);
  }

  // ── HTTP helpers ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async get(path: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ACP GET ${path} failed (${res.status}): ${body}`);
    }
    const json = await res.json();
    return json.data ?? json;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async post(path: string, body: unknown): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ACP POST ${path} failed (${res.status}): ${text}`);
    }
    const json = await res.json();
    return json.data ?? json;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
