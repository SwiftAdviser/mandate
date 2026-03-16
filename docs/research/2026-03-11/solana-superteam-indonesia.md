# Solana Superteam Indonesia — Agent Wallet Sentiment

**Source**: Solana Superteam Indonesia community
**Date**: 2026-03-11

---

## Контекст

Тот же вопрос про safeguards → но ответы принципиально другие по тону.

---

## Ключевые цитаты

> "I have mine its own private key and did not let it communicate with the outside world. I don't think there are any proper safeguards that can protect you from someone trying to jailbreak your clawbot."

> "I honestly don't think it's a problem that can be solved with the current models."

> "AI is extremely gullible and as soon as you give it public access + DEX access it could be tricked into buying a memecoin and getting dumped on."

> "A wallet controlled via a smart contract — call it a programmable wallet that has whitelist access to certain onchain programs is the lite version of the solution you're looking for."

---

## Предложенное решение (нативное)

Smart contract с allowlist других смарт-контрактов → предотвращает несанкционированные транзакции.
По сути описывают ERC-4337 session keys / smart wallet с политиками, но без знания что это уже существует.

---

## Упомянутый кейс

Lobster case: https://pashpashpash.substack.com/p/my-lobster-lost-450000-this-weekend
$450k потеряно. Уже задокументировано в docs/cases/lobster-lost-450k.md

---

## Тональный сдвиг vs других артефактов

| Комьюнити | Тон | Sophistication |
|---|---|---|
| 0xGasless | Активно ищут решение, знают архитектуру | Высокий |
| ARC | Строят, экспериментируют, паттерны нащупывают | Средний |
| Superteam Indonesia | Фатализм, "нерешаемо с текущими моделями" | Низкий-средний |

---

## Сигнал

Часть рынка пришла к выводу "это нерешаемо" и перестала искать. Это либо:
- (A) потенциальные клиенты которых нужно переубедить — они уже чувствуют боль
- (B) не наш ICP — они не будут платить за решение которое считают невозможным
