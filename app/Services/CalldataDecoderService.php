<?php

namespace App\Services;

class CalldataDecoderService
{
    // ERC20 function selectors
    const SELECTOR_TRANSFER      = '0xa9059cbb'; // transfer(address,uint256)
    const SELECTOR_TRANSFER_FROM = '0x23b872dd'; // transferFrom(address,address,uint256)
    const SELECTOR_APPROVE       = '0x095ea7b3'; // approve(address,uint256)

    // Uniswap / DEX selectors (common)
    const SELECTOR_SWAP_EXACT_IN  = '0x38ed1739';
    const SELECTOR_SWAP_EXACT_OUT = '0x8803dbee';

    /**
     * Decode calldata and return structured intent info.
     * Returns: ['action', 'recipient', 'raw_amount', 'token'] or null.
     */
    public function decode(string $calldata, string $toAddress): ?array
    {
        if (strlen($calldata) < 10) {
            // Native ETH transfer
            return [
                'action'     => 'native_transfer',
                'recipient'  => $toAddress,
                'raw_amount' => null,
                'token'      => null,
                'selector'   => null,
            ];
        }

        $selector = strtolower(substr($calldata, 0, 10));

        return match ($selector) {
            self::SELECTOR_TRANSFER      => $this->decodeTransfer($calldata, $toAddress),
            self::SELECTOR_APPROVE       => $this->decodeApprove($calldata, $toAddress),
            self::SELECTOR_TRANSFER_FROM => $this->decodeTransferFrom($calldata, $toAddress),
            self::SELECTOR_SWAP_EXACT_IN,
            self::SELECTOR_SWAP_EXACT_OUT => ['action' => 'swap', 'recipient' => null, 'raw_amount' => null, 'token' => $toAddress, 'selector' => $selector],
            default => ['action' => 'unknown', 'recipient' => null, 'raw_amount' => null, 'token' => $toAddress, 'selector' => $selector],
        };
    }

    /**
     * Is this a spend-bearing action? (approve is not spend-bearing — wallet isn't losing value)
     */
    public function isSpendBearing(string $action): bool
    {
        return in_array($action, ['transfer', 'native_transfer', 'swap'], true);
    }

    private function decodeTransfer(string $calldata, string $contractAddress): array
    {
        // transfer(address to, uint256 amount)
        // selector (4 bytes) + padded address (32 bytes) + uint256 (32 bytes)
        $hex = substr($calldata, 10); // strip selector
        if (strlen($hex) < 128) return ['action' => 'transfer', 'recipient' => null, 'raw_amount' => null, 'token' => $contractAddress, 'selector' => self::SELECTOR_TRANSFER];

        $recipient  = '0x' . substr($hex, 24, 40);
        $rawAmount  = ltrim(substr($hex, 64, 64), '0') ?: '0';

        return [
            'action'     => 'transfer',
            'recipient'  => strtolower($recipient),
            'raw_amount' => hexdec($rawAmount) > PHP_INT_MAX
                ? $this->hexToBigInt(substr($hex, 64, 64))
                : (string) hexdec($rawAmount),
            'token'      => strtolower($contractAddress),
            'selector'   => self::SELECTOR_TRANSFER,
        ];
    }

    private function decodeApprove(string $calldata, string $contractAddress): array
    {
        $hex       = substr($calldata, 10);
        $spender   = strlen($hex) >= 40 ? '0x' . substr($hex, 24, 40) : null;
        $rawAmount = strlen($hex) >= 128 ? ltrim(substr($hex, 64, 64), '0') : '0';

        return [
            'action'     => 'approve',
            'recipient'  => $spender ? strtolower($spender) : null,
            'raw_amount' => $rawAmount ? $this->hexToBigInt($rawAmount) : '0',
            'token'      => strtolower($contractAddress),
            'selector'   => self::SELECTOR_APPROVE,
        ];
    }

    private function decodeTransferFrom(string $calldata, string $contractAddress): array
    {
        $hex       = substr($calldata, 10);
        $recipient = strlen($hex) >= 128 ? '0x' . substr($hex, 88, 40) : null;
        $rawAmount = strlen($hex) >= 192 ? ltrim(substr($hex, 128, 64), '0') : '0';

        return [
            'action'     => 'transfer_from',
            'recipient'  => $recipient ? strtolower($recipient) : null,
            'raw_amount' => $rawAmount ? $this->hexToBigInt($rawAmount) : '0',
            'token'      => strtolower($contractAddress),
            'selector'   => self::SELECTOR_TRANSFER_FROM,
        ];
    }

    private function hexToBigInt(string $hex): string
    {
        // Use BCMath for big integers
        $hex    = ltrim($hex, '0') ?: '0';
        $result = '0';
        $len    = strlen($hex);

        for ($i = 0; $i < $len; $i++) {
            $result = bcadd(bcmul($result, '16'), (string) hexdec($hex[$i]));
        }

        return $result;
    }
}
