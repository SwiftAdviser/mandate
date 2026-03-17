export interface TransferSummary {
  address:     string;
  chain:       'base' | 'mainnet';
  volumeUsd:   number;  // Sum of USDC amounts transferred out
  txCount:     number;
  lastSeenAt:  number;  // Unix timestamp
}

const USDC: Record<string, string> = {
  base:    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};

const ALCHEMY_RPC: Record<string, string> = {
  base:    'https://base-mainnet.g.alchemy.com/v2',
  mainnet: 'https://eth-mainnet.g.alchemy.com/v2',
};

async function alchemyPost(apiKey: string, network: string, body: object): Promise<unknown> {
  const url = `${ALCHEMY_RPC[network]}/${apiKey}`;
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Alchemy ${network} error: ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(`Alchemy RPC error: ${json.error.message}`);
  return json.result;
}

export async function fetchUsdcSenders(
  apiKey:    string,
  network:   'base' | 'mainnet',
  days:      number,
  maxPages:  number = 100,
): Promise<TransferSummary[]> {
  const agg = new Map<string, { volumeUsd: number; txCount: number; lastSeenAt: number }>();
  const cutoffTs = Date.now() / 1000 - days * 86_400;

  let pageKey: string | undefined;
  let page = 0;

  while (page < maxPages) {
    page++;

    const params: Record<string, unknown> = {
      category:          ['erc20'],
      contractAddresses: [USDC[network]],
      excludeZeroValue:  true,
      maxCount:          '0x3e8', // 1000
      withMetadata:      true,
    };

    if (pageKey) {
      params.pageKey = pageKey;
    } else {
      // Only filter by fromBlock on first page
      // Estimate: blocksPerDay * days blocks back from "latest"
      // We don't know latest block here, so omit fromBlock and rely on maxPages cap
    }

    const result = (await alchemyPost(apiKey, network, {
      jsonrpc: '2.0',
      id:      1,
      method:  'alchemy_getAssetTransfers',
      params:  [params],
    })) as { transfers?: AlchemyTransfer[]; pageKey?: string };

    const transfers = result.transfers ?? [];

    for (const tx of transfers) {
      const from  = tx.from?.toLowerCase();
      const value = tx.value ?? 0;
      if (!from || value <= 0) continue;

      // Parse timestamp
      const ts = tx.metadata?.blockTimestamp
        ? Math.floor(new Date(tx.metadata.blockTimestamp).getTime() / 1000)
        : 0;

      // Stop if transfer is older than requested window
      if (ts > 0 && ts < cutoffTs) {
        pageKey = undefined; // Signal done
        break;
      }

      const existing = agg.get(from);
      if (existing) {
        existing.volumeUsd += value;
        existing.txCount   += 1;
        if (ts > existing.lastSeenAt) existing.lastSeenAt = ts;
      } else {
        agg.set(from, { volumeUsd: value, txCount: 1, lastSeenAt: ts });
      }
    }

    pageKey = result.pageKey;
    if (!pageKey) break;
  }

  return Array.from(agg.entries()).map(([address, s]) => ({
    address,
    chain: network,
    ...s,
  }));
}

interface AlchemyTransfer {
  from?:     string;
  to?:       string;
  value?:    number;
  asset?:    string;
  hash?:     string;
  metadata?: { blockTimestamp?: string };
}
