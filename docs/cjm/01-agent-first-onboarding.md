# CJM 1: Agent-First Onboarding

> Разработчик сначала интегрирует SDK в агента, потом привязывает к дашборду.

## Персона

Разработчик AI-агента. Пишет бота для DeFi, уже имеет кошелёк (private key). Хочет добавить лимиты расходов, чтобы агент не слил все деньги.

## Путь

```
[1. Находит Mandate]
      ↓
[2. npm install @mandate/sdk]
      ↓
[3. POST /api/agents/register] ← без auth, из кода агента
      ↓ получает runtimeKey + claimUrl
[4. Агент работает с дефолтной политикой]
      ↓
[5. Переходит по claimUrl] → /claim?code=XXXXXXXX
      ↓
[6. "Sign in with GitHub"] → GitHub OAuth → callback
      ↓
[7. Claim agent] → агент привязан к аккаунту
      ↓
[8. Dashboard] → видит агента, квоты, последние транзакции
      ↓
[9. Настраивает Policy] → лимиты, allowlist, approval threshold
```

## Этапы и точки контакта

| # | Этап | Канал | Действие | Эмоция | Метрика |
|---|------|-------|----------|--------|---------|
| 1 | Осведомлённость | Лендинг / GitHub / docs | Читает "non-custodial policy layer" | Интерес | Визиты лендинга |
| 2 | Установка SDK | Terminal | `bun add @mandate/sdk` | Нейтрально | npm downloads |
| 3 | Регистрация агента | Код агента → API | 5 строк кода: name, evmAddress, chainId | Простота или раздражение | Конверсия register → claimUrl usage |
| 4 | Работа без дашборда | Агент | Агент уже защищён дефолтной политикой ($100/tx, $1000/day) | Уверенность | Intents created before claim |
| 5 | Claim page | Браузер | Видит имя агента, адрес, chain. Понимает что привязывает | Доверие или настороженность | Claim page bounce rate |
| 6 | Auth | GitHub OAuth | Один клик. Никаких паролей | Удобство | OAuth completion rate |
| 7 | Привязка | API call | Нажимает "Claim agent" — мгновенный результат | Удовлетворение | Claim success rate |
| 8 | Dashboard | Браузер | Overview: агенты, квоты, последние интенты | Контроль | DAU dashboard |
| 9 | Настройка | PolicyBuilder | Меняет лимиты, добавляет allowlist | Уверенность | Policies created per agent |

## Pain Points

| Проблема | Где | Серьёзность | Идея решения |
|----------|-----|-------------|--------------|
| claimUrl теряется в логах | Этап 3→5 | Высокая | Показать claimUrl в ответе register + отправить email/webhook |
| Непонятно зачем claim | Этап 5 | Средняя | Объяснение на claim page: "зачем привязывать" |
| Дефолтная политика может не подходить | Этап 4 | Средняя | Параметр defaultPolicy в register() |
| Нет onboarding checklist | Этап 8 | Средняя | "Шаги: ✅ Agent registered ✅ Claimed → Configure policy" |

## Ключевые конверсии

```
register() → claimUrl visited     — ?%
claimUrl → GitHub auth            — ?%
GitHub auth → claim completed     — ?%
claim → policy configured         — ?%
```

## Файлы в кодовой базе

- SDK: `packages/sdk/src/MandateClient.ts` → `register()`
- API: `app/Http/Controllers/Api/AgentRegistrationController.php` → `register()`, `claim()`
- Frontend: `resources/js/pages/Claim.tsx`, `resources/js/pages/Login.tsx`
- Auth: `app/Http/Controllers/Auth/GitHubController.php`
