---
name: solana-protocol-ops
description: SRE / on-call for live Solana protocols — the run-time operational layer the kit is missing. Covers the full incident lifecycle (PREPARE → DETECT → TRIAGE → CONTAIN → ERADICATE → RECOVER → LEARN) for protocols live on mainnet: deriving and watching on-chain invariants, detecting drains in progress, running an incident, tracing stolen funds across swaps/CPIs/bridges with freeze-actionability scoring, coordinating comms, and turning each post-mortem into a new build-time audit rule. Reuses the Helius and Surfpool MCPs already in the kit as its data engine. For build-time security (pre-launch audits, formal verification) delegate to safe-solana-builder / trailofbits / qedgen.
user-invocable: true
---

# Solana Protocol Ops & Incident Response

> **The run-time layer.** The kit audits a protocol 5+ ways *before* launch and 0 ways *after*. This skill is what to do once your program is live on mainnet and something is — or might be — wrong.

> **Data engine:** the **Helius MCP** (`getTransactionHistory`, `parseTransaction`, `createWebhook`, DAS, wallet-analysis) + **Surfpool MCP** (mainnet-fork replay) — both already configured in the Solana AI Kit's `.mcp.json`. **Build-time hand-off:** [safe-solana-builder](https://github.com/frankcastleauditor/safe-solana-builder), [trailofbits](https://github.com/trailofbits/skills), [qedgen](https://github.com/QEDGen/solana-skills).

## What This Skill Is For

Use this skill when the user is operating a **live** Solana protocol and asks for any of:

- **"Set up monitoring / what should I watch?"** → derive invariants, stand up alerts before anything breaks
- **"Something looks wrong / are we being drained?"** → detect and classify a live incident
- **"We're being exploited — what do I do?"** → run the incident, contain, eradicate
- **"Where did the stolen funds go / can any be frozen?"** → fund-tracing forensics
- **"Write the post-mortem / how do we stop this recurring?"** → post-mortem + feed it back to build-time

This is **defensive / authorized-operator** tooling: trace-and-report and protect-your-own-protocol, never "hack back."

## The Lifecycle Spine

```
PREPARE → DETECT → TRIAGE → CONTAIN → ERADICATE → RECOVER → LEARN
                     │
                     └─ routes by incident class (see incident-taxonomy.md)
```

Every file below hangs off one phase. The three **crown jewels** (deep, differentiated): invariant monitoring, fund-tracing forensics, and the runtime→build-time feedback loop.

## Operating Procedure

### 1. Locate the request on the spine

| Phase | The question | Skill file |
|-------|--------------|------------|
| **PREPARE** | "We're not in an incident — get us ready." | [preparedness.md](preparedness.md), [invariant-monitoring.md](invariant-monitoring.md) |
| **DETECT** | "Is something wrong right now?" | [invariant-monitoring.md](invariant-monitoring.md) ⭐, [anomaly-detection.md](anomaly-detection.md) |
| **TRIAGE** | "What kind of incident is this?" | [incident-taxonomy.md](incident-taxonomy.md) |
| **CONTAIN** | "Stop the bleeding." | [pause-guardian.md](pause-guardian.md), [incident-runbook.md](incident-runbook.md) |
| **ERADICATE** | "Fix the root cause safely." | [incident-runbook.md](incident-runbook.md) |
| **RECOVER** | "Get funds back / make users whole." | [fund-tracing-forensics.md](fund-tracing-forensics.md) ⭐, [recovery-and-negotiation.md](recovery-and-negotiation.md) |
| **(all)** | "Coordinate the response." | [comms-and-coordination.md](comms-and-coordination.md) |
| **LEARN** | "Write it up; stop it recurring." | [postmortem.md](postmortem.md), [feedback-loop.md](feedback-loop.md) ⭐ |

### 2. If an incident is active, TRIAGE by class first

It is **not all drains.** Route via [incident-taxonomy.md](incident-taxonomy.md):

| Class | Examples |
|-------|----------|
| **Economic** | oracle deviation, depeg, bad-debt, liquidation cascade |
| **Exploit / drain** | infinite mint, missing validation, CPI abuse |
| **Dependency** | stale Pyth feed, broken Jupiter route, bridge compromise, RPC/Helius outage |
| **Governance / key** | multisig signer compromise, upgrade-authority leak, malicious proposal |
| **Off-chain / frontend** | DNS hijack, wallet-drainer on the site, malicious npm dep |

### 3. Pick the agent

| Task | Agent | Model |
|------|-------|-------|
| Orchestrate the whole arc | [incident-commander](../agents/incident-commander.md) | opus |

### 4. Verify against fixtures, not vibes

Historical exploits are permanently on-chain → reproducible test fixtures:
- **Cashio** (Mar 2022, ~$48M) — infinite mint → Saber → bridge → FTX. Exercises **invariant monitoring** (caught at t=0) + value/bridge tracing.
- **Mango Markets** (Oct 2022, ~$116M) — oracle manipulation. Exercises **economic detection** + **backward attribution**.
- Replay either on a mainnet fork with **Surfpool** to validate a detector or a proposed fix.

### 5. Deliver runnable artifacts

Not prose — emit things teams can run: invariant monitor scripts, Helius webhook configs, fund-flow graphs (Mermaid), labeled address dossiers, filled post-mortems, and audit-rule PRs.

---

## Progressive Disclosure (Read When Needed)

### Crown Jewels (deep)
- [invariant-monitoring.md](invariant-monitoring.md) ⭐ — derive invariants from a program, emit monitor + webhook
- [fund-tracing-forensics.md](fund-tracing-forensics.md) ⭐ — forward/backward, value-not-token, bridge hand-off, freeze scoring
- [feedback-loop.md](feedback-loop.md) ⭐ — mint build-time audit rules from a post-mortem

### Lifecycle phases
- [preparedness.md](preparedness.md) — IR plan, SEV criteria, war-room roles, drills
- [anomaly-detection.md](anomaly-detection.md) — drain-signature heuristics, baselines
- [incident-taxonomy.md](incident-taxonomy.md) — TRIAGE routing by class
- [pause-guardian.md](pause-guardian.md) — circuit breakers, partial pause, multisig/timelock
- [incident-runbook.md](incident-runbook.md) — the decision tree + nasty edge cases
- [recovery-and-negotiation.md](recovery-and-negotiation.md) — whitehat negotiation, freezes, reimbursement
- [comms-and-coordination.md](comms-and-coordination.md) — internal + external comms
- [postmortem.md](postmortem.md) — auto-filled post-mortem

### Reference
- [resources.md](resources.md) — links + Helius/Surfpool MCP tool map

---

## Task Routing Guide

| User asks about... | Primary skill file(s) |
|--------------------|----------------------|
| What to monitor / set up alerts | invariant-monitoring.md, anomaly-detection.md |
| Deriving invariants from a program | invariant-monitoring.md |
| Helius webhook config | invariant-monitoring.md, resources.md |
| "Are we being drained?" | anomaly-detection.md, incident-taxonomy.md |
| Oracle / depeg / bad-debt | incident-taxonomy.md (economic) |
| Classifying an incident | incident-taxonomy.md |
| Pausing / circuit breaker / kill switch | pause-guardian.md |
| Multisig / timelock / guarded upgrade | pause-guardian.md |
| Step-by-step "we're exploited" | incident-runbook.md |
| Pause is broken / do-nothing case / insider | incident-runbook.md (edge cases) |
| Following the stolen money | fund-tracing-forensics.md |
| Bridge / cross-chain hand-off | fund-tracing-forensics.md |
| "Can any funds be frozen?" | fund-tracing-forensics.md, recovery-and-negotiation.md |
| Whitehat negotiation message | recovery-and-negotiation.md |
| Reimbursing affected users | recovery-and-negotiation.md |
| Status updates / notifying exchanges / IC3 | comms-and-coordination.md |
| Writing the post-mortem | postmortem.md |
| Stopping it from recurring / new audit rule | feedback-loop.md |
| IR plan / SEV levels / war-room / drills | preparedness.md |
| **Pre-launch audit / formal verification** | delegate → safe-solana-builder / trailofbits / qedgen |
| **Single user tx debug** | delegate → solana-dev /debug-user-tx |

---

## Commands

| Command | Description |
|---------|-------------|
| [/incident](../commands/incident.md) | Run the full lifecycle for a program or suspicious tx |
| [/trace](../commands/trace.md) | Fund-tracing forensics on demand for an address or tx |
| [/watch](../commands/watch.md) | Derive a program's invariants and stand up live monitoring |

## Agents

| Agent | Purpose |
|-------|---------|
| [incident-commander](../agents/incident-commander.md) | Orchestrates the PREPARE→…→LEARN arc |
