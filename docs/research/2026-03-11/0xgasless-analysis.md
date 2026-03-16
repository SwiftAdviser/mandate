# 0xGasless — Анализ продукта и позиционирования

**URL**: https://0xgasless.com
**Date**: 2026-03-11

---

## Что они строят

Financial infrastructure для AI агентов на базе ERC-4337 Account Abstraction.
Фокус: дать агентам возможность исполнять транзакции без газа, с программируемыми лимитами.

**Tagline**: "Financial Autonomy for AI Agents"

## Для кого

- AI trading systems
- Autonomous DeFi агенты
- Payment automation (bills, subscriptions)
- Builders поверх AgentKit и других фреймворков

## Ключевые фичи

- Gasless execution (ERC-4337 paymaster)
- Smart accounts с spending limits + автоматическая валидация
- Модульная архитектура (берёшь нужные модули)
- 9+ chain support
- Open-source

## Метрики

- 20+ business clients
- 100+ agents deployed
- 3.5M+ TVL managed
- 25K+ agent interactions

---

## Стратегическая позиция относительно Mandate

0xGasless = **execution layer** (как транзакция попадает в сеть, кто платит газ, smart account)
Mandate = **policy layer** (можно ли этой транзакции вообще выйти, в рамках ли она лимитов, одобрил ли человек)

Они НЕ конкуренты. Они соседние слои стека:

```
[LLM решает что делать]
       ↓
[Mandate: policy check — блокирует или разрешает]
       ↓
[0xGasless: gasless execution через ERC-4337]
       ↓
[On-chain]
```

Их spending limits — это статичные конфиги в smart contract.
Наши политики — это динамические правила с USD-лимитами, allowlists, approval flow, circuit breaker.

---

## Chainlink CRE vs Mandate: почему выберут нас

### Что такое Chainlink CRE в этом контексте

Decentralized network нод, каждая независимо проверяет:
- Вписывается ли action в policy агента
- Поддерживает ли on-chain state это действие
- Соответствует ли история агента норме

Все ноды должны согласиться → только тогда транзакция строится.
Space and Time хранит историю агента с криптодоказательством.

### Сравнение по критериям

| Критерий | Chainlink CRE + SXT | Mandate |
|---|---|---|
| Доступность | "More details soon" | Live сейчас |
| Интеграция | Перестраивай архитектуру вокруг нод-консенсуса | 2 API вызова в существующий код |
| Latency | Несколько нод должны согласиться перед каждым tx | Один HTTP запрос |
| Стоимость | LINK token оплата за каждый oracle call | Flat/usage pricing |
| Кастодиальность | Нет (децентрализованная проверка) | Нет (ключ никогда не покидает агента) |
| Tamper-proof история | SXT с криптодоказательством | Централизованный audit log |
| Подходит для trading | Сомнительно (latency критична) | Да |
| Vendor lock | Chainlink ecosystem | Нет |

### Почему выберут Mandate

**1. Нужно сейчас, а не "soon"**
Trading агенты с реальными деньгами не могут ждать roadmap. Mandate работает сегодня.

**2. Latency — dealbreaker для trading**
Для торгового агента задержка между решением и исполнением — это проскальзывание и упущенная возможность. Консенсус нескольких нод несовместим с HFT-like паттернами. Mandate = один HTTP call перед подписью.

**3. Простота интеграции**
Разработчик на 0xGasless уже написал код. CRE = "перепиши архитектуру". Mandate = добавь `validate()` перед `sendTransaction()`. Один день интеграции vs недели.

**4. Non-custodial по-прежнему**
Ключевой страх builder'а — "не давать агенту контролировать ключ". Mandate решает это так же как CRE: ключ локально, политика снаружи. Разница только в том, кто проверяет.

**5. Цена**
Каждый oracle call в Chainlink стоит LINK. Для торгового агента с сотнями транзакций в день это накапливается. Mandate — предсказуемая модель.

**6. Для них decentralization не value, это overhead**
B2B trading builders не платят за децентрализацию ради децентрализации. Им нужна надёжность и скорость. CRE decentralization = избыточная сложность для их юзкейса.

### Единственное где CRE выигрывает

Tamper-proof история поведения агента (SXT) — это то чего у Mandate нет. Это закрывает behavioral drift gap из первого артефакта. Это потенциальная фича-дыра в Mandate.
