# CJM 3: Transaction Lifecycle

> Путь одной транзакции от момента, когда агент хочет перевести токены, до подтверждения on-chain.

## Персона

AI-агент (код), управляемый MandateWallet или MandateClient из SDK.

## Путь

```
[1. Агент решает сделать transfer]
      ↓
[2. MandateWallet.transfer(to, amount)]
      ↓ estimate gas → compute intentHash
[3. POST /api/validate] ← RuntimeKey auth
      ↓ PolicyEngine: decode calldata → price oracle → check limits
      ↓
  ┌── allowed: true ──────────────────┐
  │                                    │
  │ [4. Intent created: "reserved"]    │
  │       ↓                            │
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

  ┌── allowed: false ─────────┐
  │ blockReason returned       │
  │ SDK throws PolicyBlocked   │
  └────────────────────────────┘

  ┌── requiresApproval: true ──────┐
  │ status=approval_pending         │
  │ → ждёт решения человека         │
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
| 1 | Валидация | Агент → API | PolicyEngine проверяет лимиты, декодирует calldata | <100ms | 422 (blocked), 403 (circuit breaker) |
| 2 | Резервация квоты | API | QuotaManager резервирует USD из daily/monthly лимита | <10ms | 422 (quota exceeded) |
| 3 | Подпись | Агент (локально) | viem signTransaction. Ключ не покидает агента | <50ms | Signing error |
| 4 | Broadcast | Агент → RPC | Отправка signed tx в сеть | 1-30s | RPC error, nonce conflict |
| 5 | Post event | Агент → API | txHash сохраняется, status → broadcasted | <50ms | 409 (wrong state) |
| 6 | Envelope verify | Worker (async) | Сравнивает on-chain tx с validated params | 5-30s | Mismatch → circuit breaker trip |
| 7 | Reconcile | Scheduler (30s) | Проверяет finality, обновляет confirmed/expired | periodic | Expired → quota released |

## Pain Points

| Проблема | Где | Серьёзность | Идея решения |
|----------|-----|-------------|--------------|
| Агент не знает почему заблокировали | Этап 1 | Высокая | Детальный blockReason + suggestions в ответе |
| intentHash mismatch при изменении gas | Этап 1 | Средняя | SDK вычисляет hash идентично серверу (keccak) |
| Нет retry logic в SDK | Этап 4 | Средняя | Автоматический retry при nonce conflict |
| Не видно status updates в реальном времени | Этап 5-7 | Низкая | WebSocket / SSE для status updates |
| TTL 15 min может быть мало | Этап 7 | Низкая | Настраиваемый TTL в политике |

## Файлы в кодовой базе

- SDK: `packages/sdk/src/MandateWallet.ts` → `transfer()`, `sendTransaction()`
- Validate: `app/Http/Controllers/Api/ValidateController.php`
- PolicyEngine: `app/Services/PolicyEngineService.php`
- Events: `app/Http/Controllers/Api/IntentController.php` → `postEvent()`
- Envelope: `app/Services/EnvelopeVerifierService.php`
- Reconciler: `app/Console/Commands/ReconcileIntents.php`
- State machine: `app/Services/IntentStateMachineService.php`
