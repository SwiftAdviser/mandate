# CJM 1: Agent-First Onboarding

> Разработчик сначала интегрирует SDK в агента, потом привязывает к дашборду.

## Персона

Разработчик AI-агента. Пишет бота для DeFi, уже имеет кошелёк (private key). Хочет добавить лимиты расходов, чтобы агент не слил все деньги.

## Путь

```
[1. Находит Mandate]
      ↓
[2. npm install @mandate/sdk]
      ↓ или npm install @mandate/openclaw-plugin (OpenClaw)
      ↓ или npm install @mandate/eliza-plugin (ElizaOS)
      ↓ или npm install @mandate/goat-plugin (GOAT SDK)
      ↓ или npm install @mandate/agentkit-provider (Coinbase AgentKit)
[3. POST /api/agents/register] ← без auth, из кода агента
      ↓ получает runtimeKey + claimUrl
[4. Агент работает с дефолтной политикой]
      ↓ каждый transfer/sendEth проходит validate → sign → broadcast → confirm
[5. Переходит по claimUrl] → /claim?code=XXXXXXXX
      ↓
[6. "Sign in with GitHub"] → GitHub OAuth → callback
      ↓
[7. Claim agent] → агент привязан к аккаунту
      ↓
[8. Dashboard] → видит агента, квоты, последние транзакции
      ↓
[9. Настраивает Policy] → лимиты, allowlist, schedule, risk scan
      ↓
[10. Notifications] → подключает Slack / Telegram / webhook
```

## Этапы и точки контакта

| # | Этап | Канал | Действие | Эмоция | Метрика |
|---|------|-------|----------|--------|---------|
| 1 | Осведомлённость | Лендинг / GitHub / docs | Читает "non-custodial policy layer" | Интерес | Визиты лендинга |
| 2 | Установка SDK | Terminal | `bun add @mandate/sdk` или plugin для фреймворка | Простота | npm downloads |
| 3 | Регистрация агента | Код агента → API | 5 строк кода: name, evmAddress, chainId | Простота или раздражение | Конверсия register → claimUrl usage |
| 4 | Работа без дашборда | Агент | Агент уже защищён дефолтной политикой ($100/tx, $1000/day) | Уверенность | Intents created before claim |
| 5 | Claim page | Браузер | Видит имя агента, адрес, chain. Понимает что привязывает | Доверие или настороженность | Claim page bounce rate |
| 6 | Auth | GitHub OAuth | Один клик. Никаких паролей | Удобство | OAuth completion rate |
| 7 | Привязка | API call | Нажимает "Claim agent" — мгновенный результат | Удовлетворение | Claim success rate |
| 8 | Dashboard | Браузер | Overview: агенты, квоты, последние интенты | Контроль | DAU dashboard |
| 9 | Настройка | PolicyBuilder | Меняет лимиты, добавляет allowlist, включает risk scan | Уверенность | Policies created per agent |
| 10 | Notifications | Браузер | Подключает Slack/Telegram для approval alerts | Спокойствие | Notification channels configured |

## Варианты интеграции

| Фреймворк | Пакет | Тип интеграции |
|-----------|-------|----------------|
| Raw SDK | `@mandate/sdk` | MandateWallet — полный контроль |
| OpenClaw | `@mandate/openclaw-plugin` | Plugin с tools: transfer, sendEth, x402 |
| ElizaOS | `@mandate/eliza-plugin` | Plugin для ElizaOS agents |
| GOAT SDK | `@mandate/goat-plugin` | `@Tool()` decorator pattern |
| Coinbase AgentKit | `@mandate/agentkit-provider` | WalletProvider + ActionProvider |
| GAME (Virtuals) | `@mandate/game-plugin` | TS + Python SDK |
| Claude Code | `@mandate/claude-code-hook` | PreToolUse bash hook + Express server |
| MCP Server | `@mandate/mcp-server` | Cloudflare Workers MCP |

## Pain Points

| Проблема | Где | Серьёзность | Статус |
|----------|-----|-------------|--------|
| claimUrl теряется в логах | Этап 3→5 | Высокая | Показать claimUrl в ответе register + webhook |
| Непонятно зачем claim | Этап 5 | Средняя | Объяснение на claim page |
| Дефолтная политика может не подходить | Этап 4 | Средняя | Параметр defaultPolicy в register() |
| Нет onboarding checklist | Этап 8 | Средняя | "Шаги: ✅ Registered ✅ Claimed → Configure policy" |

## Ключевые конверсии

```
register() → claimUrl visited     — ?%
claimUrl → GitHub auth            — ?%
GitHub auth → claim completed     — ?%
claim → policy configured         — ?%
claim → notifications configured  — ?%
```

## Файлы в кодовой базе

- SDK: `packages/sdk/src/MandateClient.ts` → `register()`
- API: `app/Http/Controllers/Api/AgentRegistrationController.php` → `register()`, `claim()`
- Frontend: `resources/js/pages/Claim.tsx`, `resources/js/pages/Login.tsx`
- Auth: `app/Http/Controllers/Auth/GitHubController.php`
- Plugins: `packages/openclaw-plugin/`, `packages/eliza-plugin/`, `packages/goat-plugin/`, etc.
