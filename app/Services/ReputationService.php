<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ReputationService
{
    /**
     * Check EIP-8004 on-chain reputation for an EVM address.
     *
     * @return array{registered: bool, agent_id: ?string, score: ?float, feedback_count: int, degraded: bool}
     */
    public function check(string $evmAddress, int $chainId): array
    {
        $address = strtolower($evmAddress);
        $cacheKey = "rep:{$chainId}:{$address}";
        $ttl = config('mandate.reputation.cache_ttl', 300);

        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $subgraphUrl = $this->subgraphUrl($chainId);
        if (! $subgraphUrl) {
            return $this->unregisteredResult();
        }

        // Step 1: Find agent by wallet address
        $agentData = $this->querySubgraph($subgraphUrl, <<<'GQL'
            query AgentByWallet($wallet: String!) {
                agents(where: { wallet: $wallet }) {
                    id
                    agentId
                    chainId
                    name
                }
            }
        GQL, ['wallet' => $address]);

        if ($agentData === null) {
            return $this->degradedResult();
        }

        $agents = $agentData['agents'] ?? [];
        if (empty($agents)) {
            $result = $this->unregisteredResult();
            Cache::put($cacheKey, $result, $ttl);

            return $result;
        }

        $agent = $agents[0];
        $agentId = $agent['id'];

        // Step 2: Query feedbacks
        $feedbackData = $this->querySubgraph($subgraphUrl, <<<'GQL'
            query AgentReputation($agentId: String!) {
                feedbacks(
                    where: { agent_: { id: $agentId }, isRevoked: false }
                    orderBy: "createdAt"
                    orderDirection: "desc"
                    first: 100
                ) {
                    id
                    value
                    clientAddress
                    tag1
                    tag2
                    createdAt
                }
            }
        GQL, ['agentId' => $agentId]);

        if ($feedbackData === null) {
            return $this->degradedResult();
        }

        $feedbacks = $feedbackData['feedbacks'] ?? [];
        $score = $this->computeAverageScore($feedbacks);

        $result = [
            'registered' => true,
            'agent_id' => $agent['agentId'] ?? $agentId,
            'score' => $score,
            'feedback_count' => count($feedbacks),
            'degraded' => false,
        ];

        Cache::put($cacheKey, $result, $ttl);

        return $result;
    }

    private function subgraphUrl(int $chainId): ?string
    {
        $urls = config('mandate.reputation.subgraphs', []);

        return $urls[$chainId] ?? null;
    }

    private function querySubgraph(string $url, string $query, array $variables): ?array
    {
        try {
            $response = Http::timeout(5)->post($url, [
                'query' => $query,
                'variables' => $variables,
            ]);

            if (! $response->successful()) {
                Log::warning('[ReputationService] Subgraph request failed', [
                    'status' => $response->status(),
                ]);

                return null;
            }

            return $response->json('data');
        } catch (\Throwable $e) {
            Log::warning('[ReputationService] Subgraph request exception', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function computeAverageScore(array $feedbacks): ?float
    {
        if (empty($feedbacks)) {
            return null;
        }

        $total = 0;
        foreach ($feedbacks as $fb) {
            $total += (int) ($fb['value'] ?? 0);
        }

        return round($total / count($feedbacks), 2);
    }

    private function unregisteredResult(): array
    {
        return [
            'registered' => false,
            'agent_id' => null,
            'score' => null,
            'feedback_count' => 0,
            'degraded' => false,
        ];
    }

    private function degradedResult(): array
    {
        return [
            'registered' => false,
            'agent_id' => null,
            'score' => null,
            'feedback_count' => 0,
            'degraded' => true,
        ];
    }
}
