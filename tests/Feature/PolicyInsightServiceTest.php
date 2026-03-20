<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\DecisionSignal;
use App\Models\Policy;
use App\Models\PolicyInsight;
use App\Models\TxIntent;
use App\Models\User;
use App\Services\PolicyInsightService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PolicyInsightServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Agent $agent;

    private Policy $policy;

    private PolicyInsightService $service;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
        Http::fake(['*' => Http::response([], 200)]);

        $this->user = User::factory()->create();
        $this->agent = Agent::create([
            'name' => 'TestAgent',
            'wallet_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id' => '84532',
            'user_id' => $this->user->id,
        ]);
        $this->policy = Policy::create([
            'agent_id' => $this->agent->id,
            'spend_limit_per_tx_usd' => 100,
            'require_approval_above_usd' => 50,
            'is_active' => true,
            'version' => 1,
        ]);

        $this->service = app(PolicyInsightService::class);
    }

    private function createIntent(array $overrides = []): TxIntent
    {
        return TxIntent::create(array_merge([
            'agent_id' => $this->agent->id,
            'policy_id' => $this->policy->id,
            'intent_hash' => '0x'.bin2hex(random_bytes(32)),
            'chain_id' => '84532',
            'nonce' => rand(1, 9999),
            'to_address' => '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            'calldata' => '0x',
            'gas_limit' => '21000',
            'max_fee_per_gas' => '1000000000',
            'max_priority_fee_per_gas' => '100000000',
            'status' => TxIntent::STATUS_CONFIRMED,
            'decoded_action' => 'erc20_transfer',
            'amount_usd_computed' => 25.00,
            'reason' => 'Payment for service rendered',
        ], $overrides));
    }

    private function createSignal(string $type, array $overrides = []): DecisionSignal
    {
        $intent = $this->createIntent($overrides['intent'] ?? []);
        unset($overrides['intent']);

        return DecisionSignal::create(array_merge([
            'agent_id' => $this->agent->id,
            'intent_id' => $intent->id,
            'signal_type' => $type,
            'to_address' => strtolower($intent->to_address),
            'decoded_action' => $intent->decoded_action,
            'amount_usd' => $intent->amount_usd_computed,
            'chain_id' => $intent->chain_id,
            'reason' => $intent->reason,
            'day_of_week' => now()->format('l'),
            'hour_of_day' => now()->hour,
        ], $overrides));
    }

    // ── recordSignal ────────────────────────────────────────────────────────

    /** @test */
    public function record_signal_inserts_row_from_intent(): void
    {
        $intent = $this->createIntent();

        $this->service->recordSignal($intent, 'approved', 'looks good');

        $this->assertDatabaseHas('decision_signals', [
            'agent_id' => $this->agent->id,
            'intent_id' => $intent->id,
            'signal_type' => 'approved',
            'to_address' => strtolower($intent->to_address),
            'decoded_action' => 'erc20_transfer',
            'decision_note' => 'looks good',
        ]);
    }

    /** @test */
    public function record_signal_handles_null_fields_gracefully(): void
    {
        $intent = $this->createIntent([
            'decoded_action' => null,
            'amount_usd_computed' => null,
            'reason' => null,
        ]);

        $this->service->recordSignal($intent, 'approved');

        $this->assertDatabaseHas('decision_signals', [
            'intent_id' => $intent->id,
            'decoded_action' => null,
            'amount_usd' => null,
            'reason' => null,
        ]);
    }

    // ── detectAllowlistCandidate ────────────────────────────────────────────

    /** @test */
    public function detect_allowlist_candidate_after_one_approval(): void
    {
        $this->createSignal('approved');

        $this->service->analyzeAgent($this->agent->id);

        $insight = PolicyInsight::where('agent_id', $this->agent->id)
            ->where('insight_type', PolicyInsight::TYPE_ADD_TO_ALLOWLIST)
            ->first();

        $this->assertNotNull($insight);
        $this->assertSame(PolicyInsight::STATUS_ACTIVE, $insight->status);
        $this->assertEqualsWithDelta(0.4, $insight->confidence, 0.01);
        $this->assertSame(1, $insight->evidence_count);
    }

    /** @test */
    public function detect_allowlist_confidence_grows_with_evidence(): void
    {
        $addr = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

        for ($i = 0; $i < 3; $i++) {
            $this->createSignal('approved', [
                'to_address' => $addr,
                'intent' => ['to_address' => $addr],
            ]);
        }

        $this->service->analyzeAgent($this->agent->id);

        $insight = PolicyInsight::where('agent_id', $this->agent->id)
            ->where('insight_type', PolicyInsight::TYPE_ADD_TO_ALLOWLIST)
            ->first();

        $this->assertNotNull($insight);
        $this->assertEqualsWithDelta(0.7, $insight->confidence, 0.01);
        $this->assertSame(3, $insight->evidence_count);
    }

    /** @test */
    public function detect_allowlist_skips_address_already_in_allowlist(): void
    {
        $addr = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

        $this->policy->update(['allowed_addresses' => [$addr]]);

        $this->createSignal('approved', [
            'to_address' => $addr,
            'intent' => ['to_address' => $addr],
        ]);

        $this->service->analyzeAgent($this->agent->id);

        $insight = PolicyInsight::where('agent_id', $this->agent->id)
            ->where('insight_type', PolicyInsight::TYPE_ADD_TO_ALLOWLIST)
            ->first();

        $this->assertNull($insight);
    }

    /** @test */
    public function detect_allowlist_skips_when_rejections_exist(): void
    {
        $addr = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

        $this->createSignal('approved', [
            'to_address' => $addr,
            'intent' => ['to_address' => $addr],
        ]);
        $this->createSignal('rejected', [
            'to_address' => $addr,
            'intent' => ['to_address' => $addr],
        ]);

        $this->service->analyzeAgent($this->agent->id);

        $insight = PolicyInsight::where('agent_id', $this->agent->id)
            ->where('insight_type', PolicyInsight::TYPE_ADD_TO_ALLOWLIST)
            ->first();

        $this->assertNull($insight);
    }

    // ── detectThresholdRaise ────────────────────────────────────────────────

    /** @test */
    public function detect_threshold_raise_after_approval_above_threshold(): void
    {
        $this->createSignal('approved', [
            'amount_usd' => 75.00,
            'intent' => ['amount_usd_computed' => 75.00],
        ]);

        $this->service->analyzeAgent($this->agent->id);

        $insight = PolicyInsight::where('agent_id', $this->agent->id)
            ->where('insight_type', PolicyInsight::TYPE_RAISE_THRESHOLD)
            ->first();

        $this->assertNotNull($insight);
        $this->assertEqualsWithDelta(0.4, $insight->confidence, 0.01);
        $this->assertStringContains('threshold', strtolower($insight->title));
    }

    /** @test */
    public function detect_threshold_raise_skips_when_no_threshold_set(): void
    {
        $this->policy->update(['require_approval_above_usd' => null]);

        $this->createSignal('approved', [
            'amount_usd' => 75.00,
            'intent' => ['amount_usd_computed' => 75.00],
        ]);

        $this->service->analyzeAgent($this->agent->id);

        $insight = PolicyInsight::where('agent_id', $this->agent->id)
            ->where('insight_type', PolicyInsight::TYPE_RAISE_THRESHOLD)
            ->first();

        $this->assertNull($insight);
    }

    // ── detectContractAllowlist ─────────────────────────────────────────────

    /** @test */
    public function detect_contract_allowlist_from_swap_approvals(): void
    {
        $contract = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d';

        $this->createSignal('approved', [
            'to_address' => $contract,
            'decoded_action' => 'swap',
            'intent' => ['to_address' => $contract, 'decoded_action' => 'swap'],
        ]);

        $this->service->analyzeAgent($this->agent->id);

        $insight = PolicyInsight::where('agent_id', $this->agent->id)
            ->where('insight_type', PolicyInsight::TYPE_ADD_TO_CONTRACTS)
            ->first();

        $this->assertNotNull($insight);
    }

    /** @test */
    public function detect_contract_allowlist_skips_erc20_transfers(): void
    {
        // erc20_transfer is not a "contract interaction" worth allowlisting
        $this->createSignal('approved', ['decoded_action' => 'erc20_transfer']);

        $this->service->analyzeAgent($this->agent->id);

        $insight = PolicyInsight::where('agent_id', $this->agent->id)
            ->where('insight_type', PolicyInsight::TYPE_ADD_TO_CONTRACTS)
            ->first();

        $this->assertNull($insight);
    }

    // ── detectScheduleRestriction ───────────────────────────────────────────

    /** @test */
    public function detect_schedule_restriction_from_rejections(): void
    {
        for ($i = 0; $i < 2; $i++) {
            $this->createSignal('rejected', [
                'day_of_week' => 'Saturday',
                'hour_of_day' => 3,
            ]);
        }

        $this->service->analyzeAgent($this->agent->id);

        $insight = PolicyInsight::where('agent_id', $this->agent->id)
            ->where('insight_type', PolicyInsight::TYPE_SCHEDULE_RESTRICTION)
            ->first();

        $this->assertNotNull($insight);
    }

    // ── applyInsight ────────────────────────────────────────────────────────

    /** @test */
    public function apply_allowlist_insight_creates_new_policy_version(): void
    {
        $addr = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

        $insight = PolicyInsight::create([
            'agent_id' => $this->agent->id,
            'insight_type' => PolicyInsight::TYPE_ADD_TO_ALLOWLIST,
            'status' => PolicyInsight::STATUS_ACTIVE,
            'confidence' => 0.7,
            'evidence_count' => 3,
            'evidence' => [],
            'suggestion' => ['field' => 'allowed_addresses', 'action' => 'add', 'value' => $addr],
            'title' => 'Add to allowlist',
            'description' => 'test',
        ]);

        $this->service->applyInsight($insight);

        $insight->refresh();
        $this->assertSame(PolicyInsight::STATUS_ACCEPTED, $insight->status);
        $this->assertNotNull($insight->accepted_at);
        $this->assertNotNull($insight->policy_id);

        // New active policy should contain the address
        $newPolicy = $this->agent->activePolicy()->first();
        $this->assertSame(2, $newPolicy->version);
        $this->assertContains($addr, $newPolicy->allowed_addresses);
    }

    /** @test */
    public function apply_threshold_insight_raises_threshold(): void
    {
        $insight = PolicyInsight::create([
            'agent_id' => $this->agent->id,
            'insight_type' => PolicyInsight::TYPE_RAISE_THRESHOLD,
            'status' => PolicyInsight::STATUS_ACTIVE,
            'confidence' => 0.7,
            'evidence_count' => 3,
            'evidence' => [],
            'suggestion' => ['field' => 'require_approval_above_usd', 'action' => 'set', 'value' => 100],
            'title' => 'Raise threshold',
            'description' => 'test',
        ]);

        $this->service->applyInsight($insight);

        $newPolicy = $this->agent->activePolicy()->first();
        $this->assertEquals(100, (float) $newPolicy->require_approval_above_usd);
    }

    /** @test */
    public function apply_mandate_rule_insight_appends_to_guard_rules(): void
    {
        $this->policy->update(['guard_rules' => "## Block immediately\n- Never send to sanctioned addresses"]);

        $insight = PolicyInsight::create([
            'agent_id' => $this->agent->id,
            'insight_type' => PolicyInsight::TYPE_MANDATE_RULE,
            'target_section' => 'block',
            'status' => PolicyInsight::STATUS_ACTIVE,
            'confidence' => 0.7,
            'evidence_count' => 3,
            'evidence' => [],
            'suggestion' => ['section' => 'block', 'rule_text' => '- Reject transactions with reasons under 20 characters'],
            'title' => 'Add block rule',
            'description' => 'test',
        ]);

        $this->service->applyInsight($insight);

        $newPolicy = $this->agent->activePolicy()->first();
        $this->assertStringContainsString('Reject transactions with reasons under 20 characters', $newPolicy->guard_rules);
        $this->assertStringContainsString('Never send to sanctioned addresses', $newPolicy->guard_rules);
    }

    /** @test */
    public function apply_mandate_rule_creates_section_if_missing(): void
    {
        $this->policy->update(['guard_rules' => "## Allow\n- Allow transfers under $10"]);

        $insight = PolicyInsight::create([
            'agent_id' => $this->agent->id,
            'insight_type' => PolicyInsight::TYPE_MANDATE_RULE,
            'target_section' => 'block',
            'status' => PolicyInsight::STATUS_ACTIVE,
            'confidence' => 0.7,
            'evidence_count' => 3,
            'evidence' => [],
            'suggestion' => ['section' => 'block', 'rule_text' => '- Block vague reasons'],
            'title' => 'Add block rule',
            'description' => 'test',
        ]);

        $this->service->applyInsight($insight);

        $newPolicy = $this->agent->activePolicy()->first();
        $this->assertStringContainsString('## Block immediately', $newPolicy->guard_rules);
        $this->assertStringContainsString('- Block vague reasons', $newPolicy->guard_rules);
    }

    // ── dismissInsight ──────────────────────────────────────────────────────

    /** @test */
    public function dismiss_insight_marks_dismissed(): void
    {
        $insight = PolicyInsight::create([
            'agent_id' => $this->agent->id,
            'insight_type' => PolicyInsight::TYPE_ADD_TO_ALLOWLIST,
            'status' => PolicyInsight::STATUS_ACTIVE,
            'confidence' => 0.7,
            'evidence_count' => 3,
            'evidence' => [],
            'suggestion' => ['field' => 'allowed_addresses', 'action' => 'add', 'value' => '0xabc'],
            'title' => 'test',
            'description' => 'test',
        ]);

        $this->service->dismissInsight($insight);

        $insight->refresh();
        $this->assertSame(PolicyInsight::STATUS_DISMISSED, $insight->status);
        $this->assertNotNull($insight->dismissed_at);
    }

    // ── getActiveInsights ───────────────────────────────────────────────────

    /** @test */
    public function get_active_insights_returns_only_active(): void
    {
        PolicyInsight::create([
            'agent_id' => $this->agent->id, 'insight_type' => PolicyInsight::TYPE_ADD_TO_ALLOWLIST,
            'status' => PolicyInsight::STATUS_ACTIVE, 'confidence' => 0.7,
            'evidence_count' => 3, 'evidence' => [], 'suggestion' => [],
            'title' => 'active one', 'description' => 'test',
        ]);
        PolicyInsight::create([
            'agent_id' => $this->agent->id, 'insight_type' => PolicyInsight::TYPE_ADD_TO_ALLOWLIST,
            'status' => PolicyInsight::STATUS_DISMISSED, 'confidence' => 0.7,
            'evidence_count' => 3, 'evidence' => [], 'suggestion' => [],
            'title' => 'dismissed one', 'description' => 'test',
        ]);

        $insights = $this->service->getActiveInsights($this->agent->id);

        $this->assertCount(1, $insights);
        $this->assertSame('active one', $insights->first()->title);
    }

    // ── upsert behavior ─────────────────────────────────────────────────────

    /** @test */
    public function analyze_agent_upserts_existing_insight(): void
    {
        $addr = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

        // First analysis: 1 signal
        $this->createSignal('approved', [
            'to_address' => $addr,
            'intent' => ['to_address' => $addr],
        ]);
        $this->service->analyzeAgent($this->agent->id);

        $this->assertSame(1, PolicyInsight::where('agent_id', $this->agent->id)
            ->where('insight_type', PolicyInsight::TYPE_ADD_TO_ALLOWLIST)->count());

        // Second analysis: add more signals
        $this->createSignal('approved', [
            'to_address' => $addr,
            'intent' => ['to_address' => $addr],
        ]);
        $this->service->analyzeAgent($this->agent->id);

        // Should still be 1 insight, but with updated confidence
        $this->assertSame(1, PolicyInsight::where('agent_id', $this->agent->id)
            ->where('insight_type', PolicyInsight::TYPE_ADD_TO_ALLOWLIST)->count());

        $insight = PolicyInsight::where('agent_id', $this->agent->id)
            ->where('insight_type', PolicyInsight::TYPE_ADD_TO_ALLOWLIST)->first();
        $this->assertSame(2, $insight->evidence_count);
        $this->assertEqualsWithDelta(0.55, $insight->confidence, 0.01);
    }

    /** @test */
    public function analyze_does_not_resurrect_dismissed_insights(): void
    {
        $addr = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

        $this->createSignal('approved', [
            'to_address' => $addr,
            'intent' => ['to_address' => $addr],
        ]);

        $this->service->analyzeAgent($this->agent->id);

        // Dismiss
        $insight = PolicyInsight::where('agent_id', $this->agent->id)->first();
        $this->service->dismissInsight($insight);

        // Add more signals and re-analyze
        $this->createSignal('approved', [
            'to_address' => $addr,
            'intent' => ['to_address' => $addr],
        ]);
        $this->service->analyzeAgent($this->agent->id);

        // Should not create a new active insight
        $active = PolicyInsight::where('agent_id', $this->agent->id)
            ->where('status', PolicyInsight::STATUS_ACTIVE)->count();
        $this->assertSame(0, $active);
    }

    // ── helper ──────────────────────────────────────────────────────────────

    private function assertStringContains(string $needle, string $haystack): void
    {
        $this->assertTrue(
            str_contains($haystack, $needle),
            "Failed asserting that '{$haystack}' contains '{$needle}'"
        );
    }
}
