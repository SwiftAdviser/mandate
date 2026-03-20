# Multi-Chain E2E Test Results

Date: 2026-03-20

## Test Suite: MultichainE2ETest

66 tests, 137 assertions, all passing.

## Test Matrix Results

| Test Case | Ethereum (1) | Base (8453) | Solana | TON | BNB (56) |
|-----------|:-----------:|:-----------:|:------:|:---:|:--------:|
| Validate with chain param | PASS | PASS | PASS | PASS | PASS |
| Chain stored in intent | PASS | PASS | PASS | PASS | PASS |
| Chain in validate response | PASS | PASS | PASS | PASS | PASS |
| Address format validation | PASS | PASS | PASS | PASS | PASS |
| Allowlist blocks unlisted | PASS | PASS | PASS | PASS | PASS |
| Allowlist passes listed | PASS | PASS | PASS | PASS | PASS |
| Spend limit blocks over | PASS | PASS | PASS | PASS | PASS |
| Spend limit passes under | PASS | PASS | PASS | PASS | PASS |
| Blocked actions | PASS | PASS | PASS | PASS | PASS |
| Approval actions | PASS | PASS | PASS | PASS | PASS |
| Registration with chain | PASS | PASS | PASS | PASS | PASS |
| Raw validate (EVM only) | PASS | PASS | N/A | N/A | PASS |

## Additional Tests

| Test | Result |
|------|--------|
| EVM allowlist case-insensitive | PASS |
| Solana allowlist case-sensitive | PASS |
| TON raw address (0:hex) | PASS |
| TON friendly address (EQ...) | PASS |
| Rejects invalid EVM address | PASS |
| Rejects invalid Solana address | PASS |
| Non-EVM default to_address is empty | PASS |
| BNB chain in config | PASS |
| BNB tokens in registry config | PASS |
| Daily quota across chains | PASS |
| Approval threshold across chains | PASS |
| Register with legacy evmAddress | PASS |
| Register with walletAddress (new) | PASS |
| Register chainId accepts string | PASS |
| Register rejects invalid address | PASS |

## Fixes Applied

1. **BNB Chain Support**: Added BNB (56) and BNB Testnet (97) to `config/mandate.php` chains, token registry (USDC, BUSD), and `resources/js/lib/chains.ts`.

2. **Multi-Chain Registration**: `AgentRegistrationController` now accepts `walletAddress` (any blockchain format via `BlockchainAddress` rule) alongside legacy `evmAddress`. `chainId` accepts both strings and integers.

3. **Default to_address**: Changed from EVM zero address (`0x000...`) to empty string for non-EVM chains in `PolicyEngineService`.

4. **Chain in Validate Response**: Both `/api/validate` and `/api/validate/raw` now return `chain` in the JSON response.

5. **Reputation Guard in rawValidate**: Added `is_numeric($payload['chainId'])` guard before calling reputation service, matching the guard already in `validate()`.

## Regression Check

- `MultichainValidateTest`: 12/12 pass
- `UserJourneyTest`: 8/8 pass
- Full suite: 373 pass, 6 fail (all in `OnboardingTest` due to missing Vite manifest, pre-existing)

## Files Modified

- `config/mandate.php` (BNB chains + tokens)
- `resources/js/lib/chains.ts` (BNB chains)
- `app/Http/Controllers/Api/AgentRegistrationController.php` (multi-chain registration)
- `app/Http/Controllers/Api/ValidateController.php` (chain in response)
- `app/Services/PolicyEngineService.php` (empty default to_address, reputation guard)
- `tests/Feature/MultichainE2ETest.php` (new, 66 tests)
