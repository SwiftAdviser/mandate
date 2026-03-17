# CJM 3: Transaction Lifecycle

> Путь одной транзакции от момента, когда агент хочет перевести токены, до подтверждения on-chain.

## Персона

AI-агент (код), управляемый MandateWallet из SDK — или через plugin (OpenClaw, Eliza, GOAT, AgentKit, GAME).

## Путь

```
[1. Агент решает сделать transfer / sendEth]
      ↓
[2. MandateWallet.transfer(to, amount, token, { reason })]
      ↓ estimate gas → compute intentHash → attach reason
[3. POST /api/validate] ← RuntimeKey auth
      ↓ PolicyEngine pipeline:
      │  ├─ circuit breaker check
      │  ├─ decode calldata (ERC20 selector)
      │  ├─ price oracle → USD amount
      │  ├─ policy checks (limits, allowlist, schedule, selectors)
      │  ├─ Aegis risk scan → CRITICAL/HIGH/LOW
      │  ├─ EIP-8004 reputation check
      │  └─ Reason scanner (injection detection + LLM judge)
      ↓
  ┌── allowed: true ──────────────────┐
  │                                    │
  │ [4. Intent created: "reserved"]    │
  │       ↓ quota reserved             │
  │ [5. SDK signs tx locally]          │
  │       ↓ private key never leaves   │
  │ [6. SDK broadcasts to chain]       │
  │       ↓                            │
  │ [7. POST /api/intents/{id}/events] │
  │       ↓ txHash → status=broadcasted│
  │ [8. EnvelopeVerifier (async)]      │
  │       ↓ checks on-chain tx matches │
  │ [9. Reconciler confirms]           │
  │       ↓ status=confirmed           │
  │ [10. Quota released/committed]     │
  └────────────────────────────────────┘

  ┌── allowed: false ───────────────────────────────┐
  │ blockReason + blockDetail + declineMessage       │
  │                                                  │
  │ Adversarial (injection/aegis/circuit breaker):   │
  │   "SECURITY ALERT: ... halt immediately"         │
  │                                                  │
  │ Constructive (limits/allowlist/schedule):         │
  │   "Per-tx limit exceeded. Split into smaller..."  │
  │                                                  │
  │ SDK throws PolicyBlockedError w/ declineMessage  │
  │ Plugin returns { blocked, reason, declineMessage }│
  └──────────────────────────────────────────────────┘

  ┌── requiresApproval: true ──────┐
  │ status=approval_pending         │
  │ SDK throws ApprovalRequiredError│
  │ → waitForApproval() с polling  │
  │ → см. CJM 4                    │
  └─────────────────────────────────┘
```

## Состояния Intent

```
reserved → broadcasted → confirmed   (happy path)
reserved → expired                    (TTL 15 min, не broadcast)
reserved → approval_pending → approved → broadcasted → confirmed
                            → rejected → failed
broadcasted → failed                  (envelope mismatch → circuit breaker)
```

## Этапы

| # | Этап | Актор | Что происходит | Время | Failure mode |
|---|------|-------|----------------|-------|--------------|
| 1 | Валидация | Агент → API | PolicyEngine: лимиты, calldata, risk scan, reason scan | <200ms | 422 (blocked + declineMessage), 403 (circuit breaker) |
| 2 | Резервация квоты | API | QuotaManager резервирует USD из daily/monthly лимита | <10ms | 422 (quota exceeded) |
| 3 | Подпись | Агент (локально) | viem signTransaction. Ключ не покидает агента | <50ms | Signing error |
| 4 | Broadcast | Агент → RPC | Отправка signed tx в сеть | 1-30s | RPC error, nonce conflict |
| 5 | Post event | Агент → API | txHash сохраняется, status → broadcasted | <50ms | 409 (wrong state) |
| 6 | Envelope verify | Worker (async) | Сравнивает on-chain tx с validated params | 5-30s | Mismatch → circuit breaker trip |
| 7 | Reconcile | Scheduler (30s) | Проверяет finality, обновляет confirmed/expired | periodic | Expired → quota released |

## declineMessage — умные отказы для агентов

Два режима сообщений:

| Режим | blockReason | Цель | Пример |
|-------|-------------|------|--------|
| **Adversarial** | `reason_blocked` | Остановить агента. Не помогать обходить | "SECURITY ALERT: prompt injection detected. HALT immediately." |
| **Adversarial** | `aegis_critical_risk` | Остановить агента | "SECURITY ALERT: CRITICAL risk, scam/exploit signatures." |
| **Adversarial** | `circuit_breaker_active` | Полная остановка | "EMERGENCY STOP: Circuit breaker activated. Do NOT attempt further." |
| **Constructive** | `per_tx_limit_exceeded` | Помочь скорректировать | "Split into smaller amounts within limit, or ask owner to adjust." |
| **Constructive** | `daily_quota_exceeded` | Объяснить + дать план | "Quota resets at midnight UTC. Retry tomorrow." |
| **Constructive** | `monthly_quota_exceeded` | Объяснить + дать план | "Resets 1st of month. Contact wallet owner." |
| **Constructive** | `address_not_allowed` | Указать на allowlist | "Owner must add this address to policy." |
| **Constructive** | `outside_schedule` | Указать на расписание | "Wait for the next allowed window." |
| **Constructive** | `selector_blocked` | Объяснить ограничение | "Only approved function calls are allowed." |

## Доступные операции

| Операция | SDK метод | Plugin tool | Calldata |
|----------|-----------|------------|----------|
| ERC20 transfer | `wallet.transfer()` | `mandate_transfer` | `0xa9059cbb` |
| Native ETH send | `wallet.sendEth()` | `mandate_send_eth` | `0x` (empty) |
| x402 payment | `wallet.x402Pay()` | `mandate_x402_pay` | ERC20 transfer |
| Arbitrary tx | `wallet.sendTransaction()` | — | any |

## Intelligence Pipeline (validate)

```
1. Circuit breaker check
2. Active policy lookup
3. IntentHash verification (keccak256 match)
4. Calldata decode (ERC20 selector → token, recipient, amount)
5. Price oracle (token amount → USD)
6. Policy checks:
   ├─ gas_limit_exceeded
   ├─ value_wei_exceeded
   ├─ outside_schedule
   ├─ address_not_allowed
   ├─ selector_blocked
   └─ per_tx_limit_exceeded
7. Aegis risk scan (W3A) → CRITICAL blocks, HIGH forces approval
8. EIP-8004 reputation → low score / unregistered forces approval
9. Reason scanner → injection patterns → block or force approval
10. Quota check (daily/monthly) → inside DB transaction
11. Approval queue (if triggered)
12. Intent created
```

## Pain Points

| Проблема | Где | Серьёзность | Статус |
|----------|-----|-------------|--------|
| ~~Агент не знает почему заблокировали~~ | ~~Этап 1~~ | ~~Высокая~~ | ✅ Решено: `declineMessage` — умные отказы |
| ~~Нет retry logic при approval~~ | ~~Этап ApprovalRequired~~ | ~~Средняя~~ | ✅ Решено: `waitForApproval()` в SDK |
| intentHash mismatch при изменении gas | Этап 1 | Средняя | SDK вычисляет hash идентично серверу |
| Нет retry logic в SDK при nonce conflict | Этап 4 | Средняя | Автоматический retry |
| Не видно status updates в реальном времени | Этап 5-7 | Низкая | WebSocket / SSE |
| TTL 15 min может быть мало | Этап 7 | Низкая | Настраиваемый TTL |

## Файлы в кодовой базе

- SDK: `packages/sdk/src/MandateWallet.ts` → `transfer()`, `sendEth()`, `sendTransaction()`
- SDK: `packages/sdk/src/MandateClient.ts` → `validate()`, `waitForApproval()`
- SDK: `packages/sdk/src/types.ts` → `PolicyBlockedError.declineMessage`
- Validate: `app/Http/Controllers/Api/ValidateController.php`
- PolicyEngine: `app/Services/PolicyEngineService.php` → `buildDeclineMessage()`
- Aegis: `app/Services/AegisService.php`
- Reputation: `app/Services/ReputationService.php`
- Reason scanner: `app/Services/ReasonScannerService.php`
- Events: `app/Http/Controllers/Api/IntentController.php` → `postEvent()`
- Envelope: `app/Services/EnvelopeVerifierService.php`
- Reconciler: `app/Console/Commands/ReconcileIntents.php`
- State machine: `app/Services/IntentStateMachineService.php`
- Plugin (OpenClaw): `packages/openclaw-plugin/src/tools/transferTool.ts`, `sendEthTool.ts`, `x402Tool.ts`
