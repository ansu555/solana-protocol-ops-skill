---
description: "Fund-tracing forensics on demand for an address or tx"
argument-hint: "<address | tx-signature>"
---

# /trace

Run fund-tracing forensics on `$ARGUMENTS` (an address or a transaction signature) per [fund-tracing-forensics.md](../skill/fund-tracing-forensics.md) ⭐. Trace **value, not tokens**; classify every terminal; hand back a ranked, freeze-actionable ledger.

## What it does

1. **Seed + quantify** — establish the seed set (drained vaults / victim accounts / drain txs) and quantify the loss in **USD-at-slot**.
2. **Forward BFS over actors** — follow net actor-deltas; collapse same-tx swaps/wraps/self-splits (a swap is a substitution, not a hop); prune dust by fraction, **never by token type**.
3. **Classify every terminal** + score **freeze-actionability 0–3** (stablecoin-in-EOA and CEX deposits = 3, act in hours).
4. **Bridge hand-off** — on a bridge, emit destination chain + address (from the VAA) for EVM continuation.
5. **Backward trace** the funding source to a labeled entity (attribution).
6. **Emit artifacts** — fund-flow graph (Mermaid), address dossier (JSON), the **frozen / liquid / gone ledger**, and the ranked freeze-action list.

## Guardrails

- **Defensive / authorized-operator only** — trace-and-report so empowered parties can freeze. Never move attacker funds, never "hack back."
- **Read-only keys.** A tracer needs no write authority, ever.
- Validate against immutable mainnet history (no fork needed); use Surfpool only for hypothetical routes.

## Usage

```
/trace <attacker-or-vault-address>
/trace <drain-tx-signature>
```

Hands recoverable terminals to [recovery-and-negotiation.md](../skill/recovery-and-negotiation.md) and bridged branches to destination-chain tooling. If `$ARGUMENTS` is empty, ask for the seed address or drain tx.
