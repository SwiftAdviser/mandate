<?php

namespace App\Services;

use App\Models\TokenRegistry;
use App\Models\TxIntent;

class IntentSummaryService
{
    public function summarize(TxIntent $intent): string
    {
        $action = $intent->decoded_action;
        $recipient = $intent->decoded_recipient ?? $intent->to_address;

        return match ($action) {
            'transfer' => $this->transferSummary($intent, $recipient),
            'native_transfer' => $this->nativeSummary($intent, $recipient),
            'approve' => $this->approveSummary($intent, $recipient),
            'swap' => $this->swapSummary($intent),
            'transfer_from' => $this->transferFromSummary($intent, $recipient),
            'unknown' => $this->unknownSummary($intent),
            default => $this->fallbackSummary($intent, $recipient),
        };
    }

    private function transferSummary(TxIntent $intent, string $recipient): string
    {
        $amount = $this->formatTokenAmount($intent);

        return "Transfer {$amount} to ".$this->truncate($recipient);
    }

    private function nativeSummary(TxIntent $intent, string $recipient): string
    {
        $amount = $this->formatNativeAmount($intent->value_wei ?? '0');

        return "Send {$amount} ETH to ".$this->truncate($recipient);
    }

    private function approveSummary(TxIntent $intent, string $recipient): string
    {
        $amount = $this->formatTokenAmount($intent);

        return "Approve {$amount} spending for ".$this->truncate($recipient);
    }

    private function swapSummary(TxIntent $intent): string
    {
        $selector = substr($intent->calldata ?? '0x', 0, 10);

        return 'Swap via '.$this->truncate($intent->to_address)." ({$selector})";
    }

    private function transferFromSummary(TxIntent $intent, string $recipient): string
    {
        $amount = $this->formatTokenAmount($intent);

        return "TransferFrom {$amount} via ".$this->truncate($recipient);
    }

    private function unknownSummary(TxIntent $intent): string
    {
        $selector = substr($intent->calldata ?? '0x', 0, 10);

        return "Call {$selector} on ".$this->truncate($intent->to_address);
    }

    private function fallbackSummary(TxIntent $intent, string $recipient): string
    {
        $amount = $this->formatNativeAmount($intent->value_wei ?? '0');

        return "Send {$amount} ETH to ".$this->truncate($recipient);
    }

    private function formatTokenAmount(TxIntent $intent): string
    {
        $rawAmount = $intent->decoded_raw_amount;
        $token = $intent->decoded_token;
        $chainId = $intent->chain_id;

        // Preflight intents: no raw amount, use amount_usd_computed + token symbol
        if (! $rawAmount && $intent->amount_usd_computed !== null) {
            $usd = '$'.number_format((float) $intent->amount_usd_computed, 2);

            return $token ? "{$usd} {$token}" : $usd;
        }

        if (! $rawAmount || ! $token) {
            return ($rawAmount ?? '0').' tokens';
        }

        $registry = TokenRegistry::where('chain_id', $chainId)
            ->where('address', strtolower($token))
            ->first();

        if (! $registry) {
            return "{$rawAmount} tokens";
        }

        $amount = $this->rawToHuman($rawAmount, $registry->decimals);

        return "{$amount} {$registry->symbol}";
    }

    private function formatNativeAmount(string $valueWei): string
    {
        return $this->rawToHuman($valueWei, 18);
    }

    private function rawToHuman(string $rawAmount, int $decimals): string
    {
        if ($rawAmount === '0') {
            return '0';
        }

        $divisor = bcpow('10', (string) $decimals);
        $result = bcdiv($rawAmount, $divisor, 18);

        // Trim trailing zeros after decimal point
        if (str_contains($result, '.')) {
            $result = rtrim(rtrim($result, '0'), '.');
        }

        return $result;
    }

    private function truncate(string $address): string
    {
        if (strlen($address) <= 13) {
            return $address;
        }

        return substr($address, 0, 6).'...'.substr($address, -4);
    }
}
