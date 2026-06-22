# Post-Mortem — LEARN Phase

> **The write-up that writes itself — and the bridge to the feedback loop.** Most post-mortems never get written because reconstructing the timeline by hand is miserable. But this agent *already pulled* the on-chain data: the drain txs, the breached invariant, the trace ledger, the containment actions, the comms log. The post-mortem **auto-fills from artifacts you already produced.** And its most important output isn't the document — it's the **root-cause proposition** that [feedback-loop.md](feedback-loop.md) ⭐ turns into a build-time audit rule, so the same bug class is caught at compile time on the next protocol.

Use this file when an incident (or a drill) is resolved and the operator asks *"write it up"* — or whenever you need the structured root cause that feeds the loop.

This is **defensive / authorized-operator** documentation.

---

## It assembles, it doesn't interrogate

Every section maps to an artifact already generated earlier in the lifecycle. The agent's job is to *assemble*, not to re-investigate:

| Post-mortem section | Comes from | File |
|---|---|---|
| **Timeline** | the scribe's running log | [comms-and-coordination.md](comms-and-coordination.md) |
| **Detection** | which invariant/anomaly fired, at what slot | [invariant-monitoring.md](invariant-monitoring.md) ⭐ / [anomaly-detection.md](anomaly-detection.md) |
| **Classification** | the class + evidence | [incident-taxonomy.md](incident-taxonomy.md) |
| **Impact** | the frozen/liquid/gone ledger, affected-account snapshot | [fund-tracing-forensics.md](fund-tracing-forensics.md) ⭐ / [recovery-and-negotiation.md](recovery-and-negotiation.md) |
| **Response** | golden-order trace, containing action, branches hit | [incident-runbook.md](incident-runbook.md) / [pause-guardian.md](pause-guardian.md) |
| **Recovery** | freezes, negotiation, reimbursement outcome | [recovery-and-negotiation.md](recovery-and-negotiation.md) |
| **Root cause** | the one-line proposition from eradication | [incident-runbook.md](incident-runbook.md) |
| **Prevention** | the minted build-time rules | [feedback-loop.md](feedback-loop.md) ⭐ |

If a section can't be filled, that's a *finding* — a gap in instrumentation or process to fix, not a blank to leave.

---

## The template (auto-fill this)

```markdown
# Post-Mortem: <protocol> — <incident name> (<date UTC>)

## Summary
<2–3 sentences: what happened, class, impact, current status.>

## Severity & Classification
- SEV: <1–4>   Class: <economic | exploit | dependency | governance/key | off-chain>
- Evidence that set the class: <breached invariant / authorization / dep health>

## Timeline (UTC)
<auto-filled from the scribe log — detection → declaration → containment → recovery>
| Time | Event | Action | Tx / ref |

## Impact
- Loss (USD @ slot): <from trace ledger>
- Breakdown: frozen-able <$> / liquid <$> / bridged <$> / gone <$>
- Affected accounts: <count> (snapshot attached)

## Detection
- Fired by: <invariant `name` / anomaly signal> at slot <n>
- Time-to-detect: <Δ from t=0>   (gap if missed: <…>)

## Response
- Containment: <action, blast radius, reversal path>   Time-to-contain: <Δ>
- Nasty branches hit: <A–F or none>
- Do-nothing math (if applicable): <…>

## Root Cause
> <ONE sentence: the precise proposition that was violated.>
- e.g. "The mint instruction did not verify that new CASH was backed by real collateral."

## Recovery
- Freezes: <issuer/exchange, amount>   Negotiation: <outcome>   Reimbursement: <model>
- Recovered: <$ / %>   Outstanding: <$>

## What went well / what didn't
- Well: <…>   Poorly: <…>   (these tune [preparedness.md](preparedness.md))

## Prevention — build-time rules minted
<the artifacts from feedback-loop.md: Semgrep rule / qedspec / checklist row>
- See [feedback-loop.md](feedback-loop.md) for the depth-ladder mapping.

## Action items
| Item | Owner | Due |
```

---

## The root-cause sentence is the load-bearing field

Everything else documents; this one *prevents recurrence*. Discipline:

- **One violated proposition, stated precisely.** Not "we got hacked" — "the `mint` instruction never checked collateral backing." That sentence is what [feedback-loop.md](feedback-loop.md) compiles into a Semgrep pattern, a qedspec invariant, and a checklist row.
- **Root cause, not proximate cause.** "The attacker called mint" is proximate. "Mint trusted an unvalidated account as collateral" is root. The loop needs the root, because that's the class that recurs elsewhere.
- **Tie it back to the breached invariant.** The cleanest root causes are the negation of an invariant from [invariant-monitoring.md](invariant-monitoring.md) — which is exactly why the loop can "promote a tripwire into a theorem."

---

## Blameless and factual

- **Blameless.** Target systems and processes, not people — a post-mortem that blames an individual teaches the next team to hide incidents. (The governance/key insider case is handled as a *control* failure, not a name.)
- **Honest about timing.** Real time-to-detect/contain numbers, even when embarrassing — they're the input to [preparedness.md](preparedness.md)'s next drill. A flattering timeline helps no one.
- **Drills count.** A tabletop ([preparedness.md](preparedness.md)) produces a real post-mortem too, and its findings feed the loop the same way — you don't need to be exploited to learn.

---

## Output contract

When this file runs, emit:
1. **The filled post-mortem** (template above), every section sourced from a prior artifact.
2. **The root-cause proposition** — one precise sentence, isolated for the loop.
3. **Gap findings** — any section that couldn't be filled = an instrumentation/process action item.
4. **The hand-off to [feedback-loop.md](feedback-loop.md)** with the root cause + breached invariant attached.
5. **Action items** with owners and due dates.

---

## Edge cases & gotchas

- **The blank section is the finding.** A timeline you can't reconstruct means the scribe/instrumentation failed — write that as an action item, don't paper over it.
- **Proximate masquerading as root.** Stopping at "attacker called X" produces a rule that catches nothing reusable. Push to the missing check / wrong assumption.
- **Vanity timelines.** Fudging the response times corrupts the one input PREPARE most needs. Report the real numbers.
- **A post-mortem with no prevention output is half-done.** If it doesn't end in a minted rule (or an explicit "this class is unpreventable, here's the mitigation"), the loop never closes.

---

## Hand-offs

- The root cause → [feedback-loop.md](feedback-loop.md) ⭐ — mints the build-time audit rules (the whole "fit" story).
- Timing/process findings → [preparedness.md](preparedness.md) — tunes SEV, roles, and the next drill.
- The detection gap (if it was caught late or missed) → [invariant-monitoring.md](invariant-monitoring.md) ⭐ / [anomaly-detection.md](anomaly-detection.md) to add the missing detector.
- Impact and recovery numbers → [recovery-and-negotiation.md](recovery-and-negotiation.md) for the reimbursement reconciliation.
