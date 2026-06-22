---
description: "Run the full incident lifecycle for a program or suspicious tx"
argument-hint: "<program-id | tx-signature>"
---

# /incident

Run the full incident lifecycle for a live Solana protocol against `$ARGUMENTS` (a program ID or a suspicious transaction signature). This is the front door — it invokes the [incident-commander](../agents/incident-commander.md) to orchestrate the arc.

## What it does

1. **PRESERVE** — snapshot the relevant txs, affected account states, program hash, and current invariant state *before* anything is touched.
2. **DETECT / confirm** — pull the on-chain data via Helius; confirm whether an invariant or anomaly actually breached. If nothing is wrong, say so and stop (the "no incident" case).
3. **TRIAGE** — classify via [incident-taxonomy.md](../skill/incident-taxonomy.md): class + evidence + the clock.
4. **CONTAIN** — recommend the smallest reversible action ([incident-runbook.md](../skill/incident-runbook.md) → [pause-guardian.md](../skill/pause-guardian.md)); **confirm with the operator before any irreversible step.**
5. **Trace in parallel** — [fund-tracing-forensics.md](../skill/fund-tracing-forensics.md) so freeze-able terminals surface inside the hours-long window.
6. **ERADICATE** — root-cause to one sentence, fix on a Surfpool fork, replay the exploit to confirm it reverts, then guarded upgrade + incremental unpause.
7. **RECOVER + COMMS** — [recovery-and-negotiation.md](../skill/recovery-and-negotiation.md) and [comms-and-coordination.md](../skill/comms-and-coordination.md) in parallel.
8. **LEARN** — auto-filled [postmortem.md](../skill/postmortem.md) → [feedback-loop.md](../skill/feedback-loop.md) mints the build-time rule.

## Guardrails

- **Defensive / authorized-operator only.** Confirm the caller operates this protocol.
- **Confirm before every irreversible on-chain action** (pause, upgrade, key rotation, fund move) — state the action, blast radius, and reversal path first.
- Keep a running **timeline** (the post-mortem + legal record).

## Usage

```
/incident <program-id>          # full sweep + monitoring posture for a program
/incident <tx-signature>        # start from a suspicious transaction
```

If `$ARGUMENTS` is empty, ask for the program ID or tx signature and whether an incident is currently active or this is a preparedness check.
