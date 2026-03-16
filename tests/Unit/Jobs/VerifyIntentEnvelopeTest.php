<?php

namespace Tests\Unit\Jobs;

use App\Jobs\VerifyIntentEnvelope;
use App\Models\Agent;
use App\Models\Policy;
use App\Models\TxIntent;
use App\Services\CircuitBreakerService;
use App\Services\EnvelopeVerifierService;
use App\Services\IntentStateMachineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class VerifyIntentEnvelopeTest extends TestCase
{
    use RefreshDatabase;

    private function createBroadcastedIntent(): TxIntent
    {
        $agent = Agent::create([
            'id'          => Str::uuid(),
            'name'        => 'TestAgent',
            'evm_address' => '0xabcdef1234567890abcdef1234567890abcdef12',
            'chain_id'    => 84532,
        ]);

        $policy = Policy::create([
            'agent_id'               => $agent->id,
            'spend_limit_per_tx_usd' => 100,
            'is_active'              => true,
            'version'                => 1,
        ]);

        return TxIntent::create([
            'id'                       => Str::uuid(),
            'agent_id'                 => $agent->id,
            'policy_id'                => $policy->id,
            'chain_id'                 => 84532,
            'nonce'                    => 0,
            'to_address'               => '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
            'calldata'                 => '0xa9059cbb',
            'value_wei'                => '0',
            'gas_limit'                => '100000',
            'max_fee_per_gas'          => '1000000000',
            'max_priority_fee_per_gas' => '1000000000',
            'status'                   => TxIntent::STATUS_BROADCASTED,
            'intent_hash'              => '0x' . str_repeat('ab', 32),
            'tx_hash'                  => '0x' . str_repeat('ff', 32),
        ]);
    }

    /** @test */
    public function it_does_nothing_when_intent_not_found(): void
    {
        $verifier = Mockery::mock(EnvelopeVerifierService::class);
        $verifier->shouldNotReceive('verify');

        $job = new VerifyIntentEnvelope(Str::uuid()->toString(), '0xabc');
        $job->handle(
            $verifier,
            app(IntentStateMachineService::class),
            app(CircuitBreakerService::class),
        );

        // No exception = pass
        $this->assertTrue(true);
    }

    /** @test */
    public function it_does_nothing_when_intent_not_broadcasted(): void
    {
        $intent = $this->createBroadcastedIntent();
        $intent->update(['status' => TxIntent::STATUS_CONFIRMED]);

        $verifier = Mockery::mock(EnvelopeVerifierService::class);
        $verifier->shouldNotReceive('verify');

        $job = new VerifyIntentEnvelope($intent->id, '0xabc');
        $job->handle(
            $verifier,
            app(IntentStateMachineService::class),
            app(CircuitBreakerService::class),
        );

        $this->assertTrue(true);
    }

    /** @test */
    public function it_releases_job_on_propagation_delay(): void
    {
        $intent = $this->createBroadcastedIntent();

        $verifier = Mockery::mock(EnvelopeVerifierService::class);
        $verifier->shouldReceive('verify')
            ->once()
            ->with(Mockery::type(TxIntent::class), $intent->tx_hash)
            ->andReturn('propagation_delay');

        $job = new VerifyIntentEnvelope($intent->id, $intent->tx_hash);

        // Mock the InteractsWithQueue release method
        $job->job = Mockery::mock(\Illuminate\Contracts\Queue\Job::class);
        $job->job->shouldReceive('release')->once()->with(15);

        $job->handle(
            $verifier,
            app(IntentStateMachineService::class),
            app(CircuitBreakerService::class),
        );

        // Intent stays broadcasted
        $intent->refresh();
        $this->assertSame(TxIntent::STATUS_BROADCASTED, $intent->status);
    }

    /** @test */
    public function it_trips_circuit_breaker_and_fails_intent_on_mismatch(): void
    {
        $intent = $this->createBroadcastedIntent();

        $verifier = Mockery::mock(EnvelopeVerifierService::class);
        $verifier->shouldReceive('verify')
            ->once()
            ->andReturn('mismatch');

        Log::shouldReceive('critical')->once();
        Log::shouldReceive('info')->zeroOrMoreTimes();

        $job = new VerifyIntentEnvelope($intent->id, $intent->tx_hash);
        $job->handle(
            $verifier,
            app(IntentStateMachineService::class),
            app(CircuitBreakerService::class),
        );

        $intent->refresh();
        $this->assertSame(TxIntent::STATUS_FAILED, $intent->status);
        $this->assertSame('security_violation', $intent->block_reason);

        $intent->agent->refresh();
        $this->assertTrue($intent->agent->circuit_breaker_active);
    }

    /** @test */
    public function it_logs_match_and_leaves_intent_broadcasted(): void
    {
        $intent = $this->createBroadcastedIntent();

        $verifier = Mockery::mock(EnvelopeVerifierService::class);
        $verifier->shouldReceive('verify')
            ->once()
            ->andReturn('match');

        Log::shouldReceive('info')->once();

        $job = new VerifyIntentEnvelope($intent->id, $intent->tx_hash);
        $job->handle(
            $verifier,
            app(IntentStateMachineService::class),
            app(CircuitBreakerService::class),
        );

        $intent->refresh();
        $this->assertSame(TxIntent::STATUS_BROADCASTED, $intent->status);
    }

    /** @test */
    public function it_has_correct_retry_configuration(): void
    {
        $job = new VerifyIntentEnvelope('test-id', '0xabc');

        $this->assertSame(5, $job->tries);
        $this->assertSame(10, $job->backoff);
    }

    /** @test */
    public function failed_method_logs_error(): void
    {
        Log::shouldReceive('error')->once()->withArgs(function ($msg, $ctx) {
            return str_contains($msg, 'failed permanently')
                && $ctx['intent_id'] === 'test-id';
        });

        $job = new VerifyIntentEnvelope('test-id', '0xabc');
        $job->failed(new \RuntimeException('Something broke'));
    }
}
