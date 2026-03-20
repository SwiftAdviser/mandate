<?php

namespace Tests\Unit;

use App\Rules\BlockchainAddress;
use Tests\TestCase;

class BlockchainAddressTest extends TestCase
{
    private BlockchainAddress $rule;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rule = new BlockchainAddress;
    }

    private function passes(string $address): bool
    {
        $failed = false;
        $this->rule->validate('address', $address, function () use (&$failed) {
            $failed = true;
        });

        return ! $failed;
    }

    /** @test */
    public function validates_evm_addresses(): void
    {
        $this->assertTrue($this->passes('0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'));
        $this->assertTrue($this->passes('0x0000000000000000000000000000000000000000'));
        $this->assertTrue($this->passes('0xd8da6bf26964af9d7eed9e03e53415d37aa96045'));
    }

    /** @test */
    public function validates_solana_addresses(): void
    {
        $this->assertTrue($this->passes('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'));
        $this->assertTrue($this->passes('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'));
    }

    /** @test */
    public function validates_ton_raw_addresses(): void
    {
        $this->assertTrue($this->passes('0:'.str_repeat('a', 64)));
    }

    /** @test */
    public function validates_ton_friendly_addresses(): void
    {
        // EQ format (46 chars after prefix)
        $addr = 'EQ'.str_repeat('A', 46);
        $this->assertTrue($this->passes($addr));

        // UQ format
        $addr2 = 'UQ'.str_repeat('B', 46);
        $this->assertTrue($this->passes($addr2));
    }

    /** @test */
    public function rejects_garbage(): void
    {
        $this->assertFalse($this->passes('not-an-address'));
        $this->assertFalse($this->passes(''));
        $this->assertFalse($this->passes('0x123')); // too short
        $this->assertFalse($this->passes('hello world'));
        $this->assertFalse($this->passes('12345'));
    }
}
