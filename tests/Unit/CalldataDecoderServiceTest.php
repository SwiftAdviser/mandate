<?php

namespace Tests\Unit;

use App\Services\CalldataDecoderService;
use PHPUnit\Framework\TestCase;

class CalldataDecoderServiceTest extends TestCase
{
    private CalldataDecoderService $decoder;

    protected function setUp(): void
    {
        parent::setUp();
        $this->decoder = new CalldataDecoderService;
    }

    // -------------------------------------------------------------------------
    // decode() — ERC20 transfer(address,uint256)
    // -------------------------------------------------------------------------

    /** @test */
    public function it_decodes_erc20_transfer_correctly(): void
    {
        // transfer(0x1234567890123456789012345678901234567890, 5000000)
        // selector: a9059cbb
        // slot 0 (to):     000000000000000000000000 + address (40 hex chars)
        // slot 1 (amount): 64-char padded hex of 5_000_000 = 0x4c4b40
        $calldata = '0xa9059cbb'
            .'0000000000000000000000001234567890123456789012345678901234567890'
            .'00000000000000000000000000000000000000000000000000000000004c4b40';

        $contract = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
        $result = $this->decoder->decode($calldata, $contract);

        $this->assertSame('transfer', $result['action']);
        $this->assertSame('0x1234567890123456789012345678901234567890', $result['recipient']);
        $this->assertSame('5000000', $result['raw_amount']);
        $this->assertSame(strtolower($contract), $result['token']);
    }

    // -------------------------------------------------------------------------
    // decode() — ERC20 approve(address,uint256)
    // -------------------------------------------------------------------------

    /** @test */
    public function it_decodes_erc20_approve_with_spender_as_recipient(): void
    {
        // approve(spender, amount) — selector: 095ea7b3
        $calldata = '0x095ea7b3'
            .'0000000000000000000000001234567890123456789012345678901234567890'
            .'00000000000000000000000000000000000000000000000000000000004c4b40';

        $contract = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
        $result = $this->decoder->decode($calldata, $contract);

        $this->assertSame('approve', $result['action']);
        $this->assertSame('0x1234567890123456789012345678901234567890', $result['recipient']);
    }

    // -------------------------------------------------------------------------
    // decode() — ERC20 transferFrom(address,address,uint256)
    // -------------------------------------------------------------------------

    /** @test */
    public function it_decodes_erc20_transfer_from_correctly(): void
    {
        // transferFrom(from, to, amount) — selector: 23b872dd
        // slot 0: from address
        // slot 1: to address
        // slot 2: uint256 amount
        $from = '1111111111111111111111111111111111111111';
        $to = '2222222222222222222222222222222222222222';

        $calldata = '0x23b872dd'
            .'000000000000000000000000'.$from
            .'000000000000000000000000'.$to
            .'0000000000000000000000000000000000000000000000000000000000989680'; // 10_000_000

        $contract = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
        $result = $this->decoder->decode($calldata, $contract);

        $this->assertSame('transfer_from', $result['action']);
        $this->assertSame('0x'.$to, $result['recipient']);
    }

    // -------------------------------------------------------------------------
    // decode() — empty / native ETH transfer
    // -------------------------------------------------------------------------

    /** @test */
    public function it_handles_0x_calldata_as_native_transfer(): void
    {
        $toAddress = '0xDEADbeef00000000000000000000000000000001';
        $result = $this->decoder->decode('0x', $toAddress);

        $this->assertSame('native_transfer', $result['action']);
        $this->assertSame($toAddress, $result['recipient']);
        $this->assertNull($result['raw_amount']);
        $this->assertNull($result['token']);
    }

    /** @test */
    public function it_handles_empty_string_calldata_as_native_transfer(): void
    {
        $toAddress = '0xDEADbeef00000000000000000000000000000002';
        $result = $this->decoder->decode('', $toAddress);

        $this->assertSame('native_transfer', $result['action']);
        $this->assertSame($toAddress, $result['recipient']);
    }

    // -------------------------------------------------------------------------
    // decode() — unknown selector
    // -------------------------------------------------------------------------

    /** @test */
    public function it_returns_unknown_for_unrecognised_selector(): void
    {
        // 0xdeadbeef is not a known ERC20/swap selector
        $calldata = '0xdeadbeef'
            .'0000000000000000000000001234567890123456789012345678901234567890'
            .'0000000000000000000000000000000000000000000000000000000000000001';

        $toAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
        $result = $this->decoder->decode($calldata, $toAddress);

        $this->assertSame('unknown', $result['action']);
        $this->assertNull($result['recipient']);
    }

    // -------------------------------------------------------------------------
    // isSpendBearing()
    // -------------------------------------------------------------------------

    /** @test */
    public function it_marks_transfer_as_spend_bearing(): void
    {
        $this->assertTrue($this->decoder->isSpendBearing('transfer'));
    }

    /** @test */
    public function it_marks_native_transfer_as_spend_bearing(): void
    {
        $this->assertTrue($this->decoder->isSpendBearing('native_transfer'));
    }

    /** @test */
    public function it_marks_swap_as_spend_bearing(): void
    {
        $this->assertTrue($this->decoder->isSpendBearing('swap'));
    }

    /** @test */
    public function it_marks_approve_as_not_spend_bearing(): void
    {
        $this->assertFalse($this->decoder->isSpendBearing('approve'));
    }

    /** @test */
    public function it_marks_unknown_as_not_spend_bearing(): void
    {
        $this->assertFalse($this->decoder->isSpendBearing('unknown'));
    }
}
