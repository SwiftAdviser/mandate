# AI Agent Wallet Infrastructure — Landscape March 2026

**Research date**: 2026-03-11
**Sources**: WebSearch, Reddit Insights, Jina AI fetches

---

## TL;DR: Что изменилось за год

Рынок прошёл путь от "хакерских экспериментов" до профессиональной инфраструктуры.
Visa, Mastercard, Stripe, Coinbase — все запустили "agent payments" продукты в Q1 2026.
Появились funded стартапы решающие ту же задачу что Mandate.
Проблема больше не "существует ли она" — проблема "кто станет стандартом".

---

## Ключевые события (последние 30 дней)

### Coinbase Agentic Wallets — Feb 11, 2026
Coinbase запустил первую wallet infrastructure, built specifically для AI агентов.
- Programmable spending limits (session caps + per-tx limits)
- Приватный ключ в Trusted Execution Environment — агент никогда не видит ключ напрямую
- Compliance screening tools — блокировка high-risk actions до исполнения
- Позиционирование: "agent wallets should never exist without explicit constraints"

### Lobster Case — Feb 22, 2026
Агент Lobstar Wilde отправил 52.4M LOBSTAR токенов (~$250-450K paper / ~$40K реальных) в ответ на промпт "дай 4 SOL на лечение дяди".
Post-mortem разработчика (Nik Pash): НЕ prompt injection, а operational failure (session crash → reset → forgotten wallet state).
Итог: это не сделало проблему менее реальной — наоборот, стало watershed moment для всей индустрии.

### ClawJacked — Feb 2026
Oasis Security раскрыли уязвимость в OpenClaw: любой сайт мог hijack локального AI агента через WebSocket на localhost.
- Нет rate-limiting → brute-force пароля
- Auto-approval устройств → захват агента без user prompt
- Admin-level контроль над агентом и всеми подключёнными инструментами
Патч вышел в течение 24 часов (v2026.2.25).

### Memory Injection Attack на ElizaOS
Princeton + Sentient Foundation воспроизвели: вредоносные инструкции внедряются в persistent memory агента → агент вызывает wallet plugins когда не должен.
CrAIBench benchmark создан специально для тестирования resilience против этого.

---

## Карта игроков (актуальная)

### Wallet Infrastructure для агентов

| Игрок | Что делает | Статус |
|---|---|---|
| **Coinbase Agentic Wallets** | Smart wallets с spend limits, TEE ключи | Live Feb 2026 |
| **Nekuda** | "Mandate Model" — user intent capture, spend limits, approval flows | $5M funded |
| **Privy** | Embedded wallets для агентов, OpenClaw интеграция | Production |
| **Openfort** | Wallet policies для агентов | Production |
| **Lit Protocol** | MPC + TEE wallet, ElizaOS plugin | Live |
| **Oasis ROFL** | TEE-based agent wallets, multichain, keys в энклейве | Production |

### Payments Layer (новые игроки)

| Игрок | Что делает |
|---|---|
| **Skyfire** | KYAPay — "Know Your Agent" credentials, agent identity |
| **Proxy** | Virtual cards per agent, attestation-before-access |
| **Nekuda** | Agentic mandates — что агент может купить, при каких условиях |
| **Natural.co** | B2B agent payments ($9.8M funded) |
| **Rain** | Stablecoin-backed Visa cards для агентов |

### Enterprise (Visa/MC/Stripe)
- **Visa TAP**: cryptographic identity layer (HTTP message signatures)
- **Mastercard Agent Pay**: network-level agent authentication
- **Stripe**: ACP (Agent Commerce Protocol) support
- Все три запустили в 2025-2026

---

## Emerging Standard: TEE как ответ на "server-side можно обойти"

Рынок движется к одному ответу на возражение 0xGasless CTO:
**Keys in Trusted Execution Environments** — ключ генерируется и хранится в аппаратном энклейве, никогда не покидает его. Ни разработчик, ни агент, ни взломавший сервер не может его достать.

Оasis ROFL, EigenCloud, Phala Network, Lit Protocol — все реализуют этот паттерн.
ElizaOS в 2026 рекомендует запускать агентов в EigenCloud или Phala как стандарт.

**Для Mandate**: это прямой ответ на CTO objection. Но и прямой вызов — Mandate сейчас не TEE.

---

## Nekuda — НЕ конкурент (уточнение)

Useproxy.ai упоминает Nekuda с термином "mandate model" — но это нарицательное использование слова.
Nekuda = web2 checkout layer для AI агентов. ChatGPT/Gemini покупают товары у мерчантов через их AgentLane API.
Никакого крипто, никаких блокчейн транзакций, никаких spend limits для агентских кошельков.
Совпадение терминологии, не продуктов.

---

## Что стало стандартом в проде (март 2026)

1. **Dedicated agent wallet** с ограниченными средствами (не основной кошелёк)
2. **Spending limits** — per-tx + daily, enforced на уровне инфраструктуры
3. **TEE для ключей** — у профессиональных билдеров
4. **Allowlists** — только pre-approved адреса и контракты
5. **Audit logs** — transaction history с доказательствами
6. **Approval flows** — высокие суммы → human-in-the-loop

То что в 2025 было "экспериментальным советом" — сейчас baseline.

---

## Что всё ещё не решено

- **Behavioral drift detection** — нет стандарта (см. первый артефакт)
- **Memory injection** — ElizaOS уязвим, нет системного решения
- **Cross-agent attacks** — когда агент вызывает другого агента (новый вектор)
- **Feedback latency** — reputation systems всё ещё lagging indicator
- **WebSocket/local hijacking** — ClawJacked класс атак не закрыт системно

---

## Стратегический вывод для Mandate

Хорошие новости: рынок подтверждён, крупные игроки в игре, funding есть.
Плохие новости: конкуренция стала реальной, есть funded стартап с идентичной концепцией.

Вопрос для брейншторма: что делает Mandate уникальным в мире где Coinbase, Nekuda, Privy, Lit все решают части этой проблемы?
