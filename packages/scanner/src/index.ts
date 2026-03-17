import { Cli, z } from 'incur';
import { fetchRegisteredAgents } from './sources/erc8004.js';
import { fetchUsdcSenders } from './sources/alchemy.js';
import { computeRiskScore } from './scoring.js';
import { detectType, inferFramework } from './signals.js';
import type { ScoredAgent } from './scoring.js';

const CHAIN_IDS: Record<string, number[]> = {
  base:    [8453],
  mainnet: [1],
  all:     [8453, 1],
};

const ALCHEMY_NETWORKS: Record<string, Array<'base' | 'mainnet'>> = {
  base:    ['base'],
  mainnet: ['mainnet'],
  all:     ['base', 'mainnet'],
};

Cli.create('mandate-scanner', {
  description: 'Find unprotected AI agent wallets on-chain for Mandate ICP outreach',
})
  .command('scan', {
    description: 'Scan ERC-8004 registry + USDC flows to find agent wallets',
    options: z.object({
      chain:     z.enum(['base', 'mainnet', 'all']).default('base').describe('Chain(s) to scan'),
      days:      z.coerce.number().default(7).describe('Lookback window in days'),
      minVolume: z.coerce.number().default(5_000).describe('Min USDC volume (USD) to include'),
      top:       z.coerce.number().default(100).describe('Max results'),
      maxPages:  z.coerce.number().default(50).describe('Max Alchemy pages per chain (1000 transfers/page)'),
    }),
    env: z.object({
      ALCHEMY_API_KEY: z.string().describe('Alchemy API key — get free at alchemy.com'),
    }),
    output: z.object({
      agents: z.array(z.object({
        rank:             z.number(),
        address:          z.string(),
        chain:            z.string(),
        volumeUsd7d:      z.number(),
        txCount7d:        z.number(),
        type:             z.string(),
        frameworkHint:    z.string(),
        erc8004Name:      z.string().optional(),
        erc8004Mcp:       z.string().optional(),
        erc8004A2a:       z.string().optional(),
        erc8004Web:       z.string().optional(),
        erc8004Email:     z.string().optional(),
        mandateProtected: z.boolean(),
        riskScore:        z.number(),
      })),
      summary: z.object({
        totalScanned:      z.number(),
        registered8004:    z.number(),
        unregistered:      z.number(),
        totalVolumeUsd7d:  z.number(),
        topRiskScore:      z.number(),
      }),
    }),

    async run(c) {
      const { chain, days, minVolume, top, maxPages } = c.options;
      const { ALCHEMY_API_KEY }                        = c.env;

      // 1. Fetch ERC-8004 registered agents
      process.stderr.write('Fetching ERC-8004 registered agents...\n');
      const registeredRaw  = await fetchRegisteredAgents(CHAIN_IDS[chain]);
      const registeredMap  = new Map(registeredRaw.map(a => [a.walletAddress.toLowerCase(), a]));
      process.stderr.write(`Found ${registeredRaw.length} registered agents\n`);

      // 2. Fetch USDC senders from Alchemy
      process.stderr.write('Scanning USDC flows...\n');
      const networks = ALCHEMY_NETWORKS[chain];
      const allSenders = (
        await Promise.all(
          networks.map(n => fetchUsdcSenders(ALCHEMY_API_KEY, n, days, maxPages)),
        )
      ).flat();
      process.stderr.write(`Found ${allSenders.length} USDC senders\n`);

      // 3. Merge: registered agents + USDC senders
      const candidates = new Map<string, {
        address:     string;
        chain:       string;
        volumeUsd:   number;
        txCount:     number;
        lastSeenAt:  number;
        registered?: ReturnType<typeof registeredMap.get>;
      }>();

      for (const sender of allSenders) {
        if (sender.volumeUsd < minVolume && sender.txCount < 10) continue;
        const key = sender.address.toLowerCase();
        candidates.set(key, {
          address:    sender.address,
          chain:      sender.chain,
          volumeUsd:  sender.volumeUsd,
          txCount:    sender.txCount,
          lastSeenAt: sender.lastSeenAt,
          registered: registeredMap.get(key),
        });
      }

      // Also include registered agents not yet in USDC senders
      for (const [addr, reg] of registeredMap) {
        if (!candidates.has(addr)) {
          candidates.set(addr, {
            address:    reg.walletAddress,
            chain:      reg.chain === 8453 ? 'base' : 'mainnet',
            volumeUsd:  0,
            txCount:    0,
            lastSeenAt: 0,
            registered: reg,
          });
        }
      }

      // 4. Pre-score without type, then detect types only on top candidates
      const allEntries = Array.from(candidates.values());
      const preScored  = allEntries
        .map(e => ({
          ...e,
          preScore: computeRiskScore(e.volumeUsd, e.txCount, e.lastSeenAt, false),
        }))
        .filter(e => e.preScore > 0 || e.registered)
        .sort((a, b) => b.preScore - a.preScore)
        .slice(0, top * 2); // Only detect types for 2× top candidates

      process.stderr.write(`Detecting contract types for ${preScored.length} candidates...\n`);
      const scored: ScoredAgent[] = [];
      const BATCH = 20;

      for (let i = 0; i < preScored.length; i += BATCH) {
        const batch = preScored.slice(i, i + BATCH);
        const types = await Promise.all(
          batch.map(e =>
            detectType(e.address, (e.chain === 'base' ? 'base' : 'mainnet')),
          ),
        );

        for (let j = 0; j < batch.length; j++) {
          const e         = batch[j];
          const type      = types[j];
          const isReg     = !!e.registered;
          const framework = inferFramework(type, isReg);
          const score     = computeRiskScore(e.volumeUsd, e.txCount, e.lastSeenAt, false);

          scored.push({
            rank:             0,
            address:          e.address,
            chain:            e.chain,
            volumeUsd7d:      e.volumeUsd,
            txCount7d:        e.txCount,
            type,
            frameworkHint:    framework,
            erc8004Name:      e.registered?.name,
            erc8004Mcp:       e.registered?.mcp,
            erc8004A2a:       e.registered?.a2a,
            erc8004Web:       e.registered?.web,
            erc8004Email:     e.registered?.email,
            mandateProtected: false,
            riskScore:        score,
            lastSeenAt:       e.lastSeenAt,
          });
        }
      }

      // 5. Sort by risk score descending, assign ranks, cap at top
      scored.sort((a, b) => b.riskScore - a.riskScore);
      const results = scored.slice(0, top).map((a, i) => ({ ...a, rank: i + 1 }));

      const registered8004count = results.filter(a => a.erc8004Name).length;
      const totalVolume         = results.reduce((s, a) => s + a.volumeUsd7d, 0);

      return c.ok({
        agents:  results,
        summary: {
          totalScanned:     candidates.size,
          registered8004:   registered8004count,
          unregistered:     candidates.size - registered8004count,
          totalVolumeUsd7d: Math.round(totalVolume),
          topRiskScore:     results[0]?.riskScore ?? 0,
        },
      });
    },
  })
  .serve();
