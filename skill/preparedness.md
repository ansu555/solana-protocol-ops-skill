# Preparedness — PREPARE Phase

> **The work that decides the incident before it starts.** Almost no Solana protocol has an incident-response plan — which is exactly why this phase is novel and valuable. The hour you're being drained is the worst possible time to discover your pause needs 4 signatures from people asleep in 4 timezones. This file authors the **IR plan ahead of time**: SEV criteria, war-room roles, break-glass procedures, pre-positioned pause authority, and the **tabletop drills** that prove all of it actually works. Every other file in this skill is sharper when this one was done first.

Use this file when the operator is **not** in an incident and asks *"how do we get ready?"*, *"what's our IR plan?"*, or *"set up our monitoring/on-call before something breaks."* This is the calm-weather phase.

This is **defensive / authorized-operator** preparation for your own protocol.

---

## The five things to have ready (in priority order)

If a team does only what it has time for, do them top-down:

1. **Monitoring that pages a human** — invariants + anomalies live *before* launch, wired to an alert that wakes someone. A detector nobody sees is theater. → [invariant-monitoring.md](invariant-monitoring.md) ⭐, [anomaly-detection.md](anomaly-detection.md).
2. **A reachable, scoped pause** — a guardian authority that can halt the right surface in one signature, tested. → [pause-guardian.md](pause-guardian.md).
3. **SEV criteria + an on-call rotation** — so "is this an incident?" and "who acts?" are answered in advance (below).
4. **A pre-positioned break-glass tx** — the pause transaction pre-built and pre-reviewed in the multisig.
5. **One tabletop drill** — run the plan against a fake Cashio before a real one (below).

---

## SEV criteria (define these now, not at 3am)

Severity sets escalation and who you wake. It is **orthogonal to incident class** ([incident-taxonomy.md](incident-taxonomy.md) sets class; this sets urgency). Calibrate the thresholds to *your* TVL.

| SEV | Meaning | Example | Response |
|---|---|---|---|
| **SEV1** | Active fund loss or imminent, large | drain in progress, depeg accelerating, signer compromised | Full war room, page everyone, pause authority on standby |
| **SEV2** | Serious risk, not yet losing funds | invariant breach with no drain yet, critical dep down | War room, on-call lead + guardian engaged |
| **SEV3** | Degraded / suspicious | anomaly correlation, elevated failures, minor dep flakiness | On-call investigates, no war room |
| **SEV4** | Informational | single soft anomaly, recovered blip | Logged, reviewed next business day |

Write the **declaration rule**: who can declare a SEV1, and the bias (*over*-declare and stand down — a stood-down SEV1 costs minutes; a missed one costs the protocol).

---

## War-room roles

In an incident, undefined roles mean everyone debugs and nobody decides. Assign these names *now*:

| Role | Owns | Does NOT |
|---|---|---|
| **Incident Commander** | the decisions, the order of operations, the go/no-go on irreversible actions | touch the keyboard / debug |
| **Scribe** | the timeline — every action, time, and tx, in one running log (this becomes the post-mortem and the legal record) | make decisions |
| **Comms lead** | all external messaging, exchange/LE notifications, integrator alerts | speak without commander sign-off |
| **Operators (1–2)** | execute on-chain actions, run traces, pull data | decide whether to act |

One person can hold multiple roles in a small team — but **the commander must not also be heads-down in the keyboard**; someone has to keep altitude. The [incident-commander agent](../agents/incident-commander.md) is built to fill the commander seat.

---

## Break-glass procedures

The pre-written, pre-authorized emergency actions, so execution is signature-only under stress:

- **Pre-built pause tx** in the multisig, reviewed, ready to sign ([pause-guardian.md](pause-guardian.md)).
- **A runbook contact sheet** — guardian signers, oracle provider contact, the bridge teams you depend on, exchange compliance/abuse desks, and your chain-analysis/legal contacts ([comms-and-coordination.md](comms-and-coordination.md)).
- **Pre-positioned authority** — confirm *now* that the guardian key works, the signers are reachable, and the quorum can be met fast. Measure the real latency.
- **The "do-nothing" criteria** — pre-agree when *not* pausing is correct ([incident-runbook.md](incident-runbook.md) branch B), so it's a considered policy, not a panic decision.

---

## Tabletop drills (the part that proves it works)

A plan untested is a hypothesis. Run the historical exploits as drills:

1. **Replay Cashio on Surfpool** ([resources.md](resources.md)) and have the team run the *whole* arc — detect → declare SEV → triage → pause → trace → comms-draft → post-mortem — on the clock.
2. **Deliberately break something** — "the guardian's primary signer is on a plane." Force [incident-runbook.md](incident-runbook.md) branch A.
3. **Measure**: time-to-detect, time-to-declare, time-to-contain, quorum latency. These numbers are your real SLA.
4. **Fix what the drill exposed** — a pause that took 25 minutes is a finding, not a footnote.

A team that has drilled Cashio once responds to its real cousin an order of magnitude faster. This is the single highest-leverage thing in PREPARE.

---

## Output contract

When this file runs, produce **artifacts the team keeps**:
1. **The IR plan doc** — SEV table, declaration rule, role assignments (real names).
2. **The break-glass kit** — pre-built pause tx reference + contact sheet.
3. **Monitoring stood up** — invariants + anomalies live and paging (links to those files' configs).
4. **A drill report** — the measured timings and the gaps found.
5. **A re-test cadence** — when to re-drill (after every major upgrade, at minimum quarterly).

---

## Edge cases & gotchas

- **A plan nobody rehearsed.** The most common failure: a beautiful IR doc that's never been run, so the quorum latency is unknown until the worst moment. Drill it.
- **Single points of failure in the response.** One guardian signer, one person who knows the deploy process, one unmonitored timezone — each is an incident waiting for its trigger.
- **Roles that collapse into "everyone panics."** Without an assigned commander and scribe, the timeline is lost (no post-mortem, no legal record) and decisions get made five times.
- **SEV inflation or deflation.** No declaration rule → either everything is a SEV1 (fatigue) or nothing is (missed). Write the bias down: over-declare, stand down cheaply.
- **Stale contact sheets.** Exchange/oracle/bridge contacts rot; re-verify them on the drill cadence.

---

## Hand-offs

- Stand up the detectors this phase requires → [invariant-monitoring.md](invariant-monitoring.md) ⭐, [anomaly-detection.md](anomaly-detection.md).
- Build and test the pause/break-glass → [pause-guardian.md](pause-guardian.md).
- When a real incident fires, the plan executes via → [incident-taxonomy.md](incident-taxonomy.md) → [incident-runbook.md](incident-runbook.md).
- The comms contact sheet and templates → [comms-and-coordination.md](comms-and-coordination.md).
- The drill's post-mortem feeds → [postmortem.md](postmortem.md) → [feedback-loop.md](feedback-loop.md) ⭐ (yes, drill findings can mint rules too).
- The commander seat → [incident-commander agent](../agents/incident-commander.md).
