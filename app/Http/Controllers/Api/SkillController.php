<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AgentApiKey;
use App\Models\SkillHeartbeat;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SkillController extends Controller
{
    public function show(Request $request): Response
    {
        $content = file_get_contents(resource_path('skill.md'));
        $version = $this->parseVersion($content);

        $agentId = $this->resolveAgentId($request);

        SkillHeartbeat::create([
            'agent_id' => $agentId,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent() ? substr($request->userAgent(), 0, 512) : null,
            'skill_version' => $version ?? 'unknown',
        ]);

        return response($content, 200, [
            'Content-Type' => 'text/markdown; charset=utf-8',
            'X-Skill-Version' => $version ?? 'unknown',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    private function parseVersion(string $content): ?string
    {
        if (preg_match('/^version:\s*(.+)$/m', $content, $matches)) {
            return trim($matches[1]);
        }

        return null;
    }

    private function resolveAgentId(Request $request): ?string
    {
        $raw = $request->bearerToken();

        if (! $raw || (! str_starts_with($raw, 'mndt_live_') && ! str_starts_with($raw, 'mndt_test_'))) {
            return null;
        }

        $hash = hash('sha256', $raw);
        $key = AgentApiKey::with('agent')
            ->where('key_hash', $hash)
            ->whereNull('revoked_at')
            ->first();

        return $key?->agent?->id;
    }
}
