---
description: "Derive a program's invariants and stand up live monitoring"
argument-hint: "<program-id>"
---

# /watch

Derive the on-chain **invariants** for the program `$ARGUMENTS` and stand up live monitoring, per [invariant-monitoring.md](../skill/invariant-monitoring.md) ⭐. This is the PREPARE/DETECT entry point — do it before anything breaks.

## What it does

1. **Inspect the program** — accounts, instructions, and state layout (verified against on-chain data, not assumed).
2. **Derive invariants** across the five families — conservation, solvency, custody, bounds, authority (e.g. `total_supply == total_backing`, `sum(user_balances) == vault`, `LTV <= max`, `oracle within confidence band`).
3. **Emit runnable artifacts** — a declarative `invariants.json` spec + a generic `monitor.ts` runner (`@solana/kit`) + a Helius **enhanced-webhook** config tuned to the program's accounts (push, not poll).
4. **Add anomaly baselines** — robust baselines for the signals no hard invariant covers ([anomaly-detection.md](../skill/anomaly-detection.md)).
5. **Validate** — replay a relevant historical exploit on Surfpool (or assert the invariant would have caught a known class at t=0).

## Guardrails

- **Defensive / authorized-operator only**; **read-only keys** for all monitoring.
- A breached invariant is a *certainty* → route it to [incident-taxonomy.md](../skill/incident-taxonomy.md); a soft anomaly only *raises a hand* → page a human, never auto-act.

## Usage

```
/watch <program-id>
```

Pairs with [preparedness.md](../skill/preparedness.md) for who watches the alerts and when they page. If `$ARGUMENTS` is empty, ask for the program ID (and the IDL/source if available, to sharpen invariant derivation).
