<?php

namespace Tests\Feature;

use App\Jobs\SendApprovalNotification;
use App\Models\Agent;
use App\Models\Policy;
use App\Models\TokenRegistry;
use App\Services\PolicyEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

class ApprovalNotificationJobTest extends TestCase
{
    use RefreshDatabase;

    private const USDC_ADDRESS = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
    private const CHAIN_ID     = 84532;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        Http::fake(['*' => Http::response([
            'data' => [['prices' => [['value' => '1.00']]]],
        ], 200)]);

        config(['mandate.reputation.enabled' => false]);

        TokenRegistry::create([
            'chain_id'  => self::CHAIN_ID,
            'address'   => self::USDC_ADDRESS,
            'symbol'    => 'USDC',
            'decimals'  => 6,
            'is_stable' => true,
        ]);
    }

    private function buildPayload(array $overrides = []): array
    {
        $base = [
            'chainId'              => self::CHAIN_ID,
            'nonce'                => 0,
            'to'                   => self::USDC_ADDRESS,
            'calldata'             => '0xa9059cbb'
                . '000000000000000000000000abcdef1234567890abcdef1234567890abcdef12'
                . '0000000000000000000000000000000000000000000000000000000000989680',
            'valueWei'             => '0',
            'gasLimit'             => '100000',
            'maxFeePerGas'         => '1000000000',
            'maxPriorityFeePerGas' => '1000000000',
            'txType'               => 2,
            'accessList'           => [],
            'reason'               => 'Test payment for notification test',
        ];

        $merged = array_merge($base, $overrides);

        $packed = implode('|', [
            $merged['chainId'],
            $merged['nonce'],
            strtolower($merged['to']),
            strtolower($merged['calldata'] ?? '0x'),
            $merged['valueWei'] ?? '0',
            $merged['gasLimit'],
            $merged['maxFeePerGas'],
            $merged['maxPriorityFeePerGas'],
            $merged['txType'] ?? 2,
            json_encode($merged['accessList'] ?? []),
        ]);

        $merged['intentHash'] = '0x' . \kornrunner\Keccak::hash($packed, 256);

        return $merged;
    }

    /** @test */
    public function job_is_dispatched_when_approval_created(): void
    {
        Queue::fake();

        $agent = Agent::create([
            'id'          => Str::uuid(),
            'name'        => 'TestAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id'    => self::CHAIN_ID,
            'notification_webhooks' => [
                ['type' => 'slack', 'url' => 'https://hooks.slack.com/services/T00/B00/xxx'],
            ],
        ]);

        Policy::create([
            'agent_id'                  => $agent->id,
            'spend_limit_per_tx_usd'    => 1000,
            'spend_limit_per_day_usd'   => 10000,
            'require_approval_above_usd'=> 5.0,
            'is_active'                 => true,
            'version'                   => 1,
        ]);

        $service = app(PolicyEngineService::class);
        $result  = $service->validate($agent, $this->buildPayload());

        $this->assertTrue($result['requiresApproval']);
        $this->assertNotNull($result['approvalId']);

        Queue::assertPushed(SendApprovalNotification::class, function ($job) use ($result) {
            return $job->approvalId === $result['approvalId']
                && $job->intentId === $result['intentId'];
        });
    }

    /** @test */
    public function job_is_not_dispatched_when_no_approval_needed(): void
    {
        Queue::fake();

        $agent = Agent::create([
            'id'          => Str::uuid(),
            'name'        => 'TestAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id'    => self::CHAIN_ID,
        ]);

        Policy::create([
            'agent_id'               => $agent->id,
            'spend_limit_per_tx_usd' => 1000,
            'spend_limit_per_day_usd'=> 10000,
            'is_active'              => true,
            'version'                => 1,
        ]);

        $service = app(PolicyEngineService::class);
        $result  = $service->validate($agent, $this->buildPayload());

        $this->assertTrue($result['allowed']);
        $this->assertFalse($result['requiresApproval']);

        Queue::assertNotPushed(SendApprovalNotification::class);
    }

    /** @test */
    public function job_handles_http_failure_gracefully(): void
    {
        Http::fake([
            'hooks.slack.com/*' => Http::response('error', 500),
            '*' => Http::response([
                'data' => [['prices' => [['value' => '1.00']]]],
            ], 200),
        ]);

        $agent = Agent::create([
            'id'          => Str::uuid(),
            'name'        => 'TestAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id'    => self::CHAIN_ID,
            'notification_webhooks' => [
                ['type' => 'slack', 'url' => 'https://hooks.slack.com/services/T00/B00/xxx'],
            ],
        ]);

        Policy::create([
            'agent_id'                  => $agent->id,
            'spend_limit_per_tx_usd'    => 1000,
            'spend_limit_per_day_usd'   => 10000,
            'require_approval_above_usd'=> 5.0,
            'is_active'                 => true,
            'version'                   => 1,
        ]);

        $service = app(PolicyEngineService::class);
        $result  = $service->validate($agent, $this->buildPayload());

        // Manually run the job (sync) — should not throw
        $job = new SendApprovalNotification(
            $result['approvalId'],
            $result['intentId'],
            $agent->id,
        );
        $job->handle(app(\App\Services\ApprovalNotificationService::class));

        $this->assertTrue(true); // no exception
    }
}
