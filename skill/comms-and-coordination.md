# Comms & Coordination

> **Half the outcome of an incident is communication.** Two protocols can suffer the identical exploit; the one that communicates well keeps its users and lives, the one that goes silent or lies dies of the second crisis — the trust crisis. This file runs both halves: the **internal war room** (who knows what, who decides, who keeps the timeline) and the **external comms** (users, exchanges, law enforcement, chain-analysis firms, integrators). Comms runs across *every* phase, not just at the end — which is why [SKILL.md](SKILL.md) hangs it off "(all)".

Use this file when the operator asks *"what do we tell people?"*, *"who do we notify?"*, *"how do we reach an exchange / law enforcement?"*, or needs to run the internal war room.

This is **defensive / authorized-operator** coordination. External statements are **operator-and-counsel approved before publishing** — they are permanent and legally consequential.

---

## Internal: run the war room

The roles are defined in [preparedness.md](preparedness.md); this is how they operate live.

- **One timeline, one scribe.** Every action, decision, and tx in a single running log with timestamps. This is simultaneously the post-mortem source, the legal record, and the thing that stops the team from making the same decision five times. → [postmortem.md](postmortem.md) consumes it directly.
- **One commander, one channel.** A single dedicated incident channel; the commander sets the next action and the cadence. Side-channel debugging that doesn't reach the timeline didn't happen.
- **Cadence over chaos.** A short sync on a fixed interval ("every 15 min: status, blockers, next action") beats a 200-message scroll. Decisions are stated explicitly and logged.
- **Need-to-know for the sensitive bits.** Attribution details, unannounced vulnerabilities, and the governance/key-compromise case ([incident-runbook.md](incident-runbook.md) branch C) stay in a tighter circle until disclosed deliberately.

---

## External: who to notify, and how fast

Different audiences, different clocks, different messages. Run the time-critical ones in parallel with containment.

| Audience | When | Why | Channel |
|---|---|---|---|
| **Users** | fast — within the first window | stop the bleeding (esp. off-chain/frontend: "don't sign on our site") | status post + pinned social + in-app banner |
| **Exchanges (compliance/abuse)** | immediately if funds reach a CEX | freeze the deposit + preserve KYC — hours-critical | abuse desk / compliance contact ([preparedness.md](preparedness.md) contact sheet) |
| **Stablecoin issuers (Circle/Tether)** | immediately for score-3 stablecoin terminals | issuer-level freeze | via LE referral ([recovery-and-negotiation.md](recovery-and-negotiation.md)) |
| **Law enforcement (IC3 / local)** | early | unlocks issuer freezes, starts the case | IC3 filing + case number |
| **Chain-analysis firms** (Chainalysis/Arkham/TRM) | when funds are moving/bridging | labeling, cross-chain continuation, attribution | direct engagement |
| **Integrators / composing protocols** | as soon as contagion is possible | they may need to pause *their* product ([incident-runbook.md](incident-runbook.md) branch D) | direct, pre-incident relationships |
| **Auditors / the kit's build-time teams** | post-incident | the root cause becomes a build-time rule | [feedback-loop.md](feedback-loop.md) ⭐ |

---

## The public statement (do this well or pay later)

Trust survives an exploit; it does not survive a cover-up. The principles:

- **Acknowledge fast, even with little.** "We're aware of an issue affecting <protocol>, we've paused <X>, funds are <status>, more in 1 hour." Silence reads as either incompetence or exit-scam.
- **Be honest about scope.** Don't minimize ("small issue") then revise upward — that's the credibility-killer. If you don't know the number yet, say you don't know and give a time you will.
- **Never promise what you can't deliver.** "Funds are safe" before you've confirmed it is the worst sentence in incident comms.
- **Lead users to a safe action.** What should they *do* — stop signing, revoke approvals, wait? Especially for off-chain/frontend, the user action is the containment.
- **Cadence.** Commit to an update interval and hit it, even if the update is "still investigating." Predictability rebuilds calm.

**Holding-statement template:**
```
We are aware of an incident affecting <protocol> as of <time UTC>.
What we know: <one or two factual lines>.
What we've done: <paused X / disabled Y>.
What you should do: <stop signing on our site / revoke approvals / no action needed>.
We will post the next update by <time>. Funds status: <confirmed-safe / under assessment — do not guess>.
```

---

## Off-chain / frontend: the comms-led incident

When [incident-taxonomy.md](incident-taxonomy.md) routes to off-chain/frontend, **comms *is* the containment** — the protocol may need no on-chain action, but every page-load is a new victim until users are warned. Fire the user warning first, with explicit revoke instructions, before anything else.

---

## Output contract

When this file runs, emit:
1. **The war-room setup** — channel, commander, scribe, cadence.
2. **A notification matrix** — each audience with its message, channel, and deadline, prioritized by clock.
3. **The drafted public statement(s)** — holding statement now, follow-ups on cadence, all marked "operator+counsel approval required."
4. **The contact actions** — exchange/issuer/LE/integrator outreach with what evidence each gets.
5. **A comms log** folded into the incident timeline.

---

## Edge cases & gotchas

- **Silence is a decision, and usually the wrong one.** A vacuum gets filled with rumor and "exit scam" accusations. Acknowledge fast.
- **Over-promising "funds are safe."** Never state safety you haven't verified; the walk-back costs more trust than the original incident.
- **Tipping off the attacker.** Public detail on *how* you're tracing or *what* you'll patch can help them escape or re-hit. Coordinate public disclosure with the containment/recovery state.
- **Notifying integrators too late.** Contagion partners need to hear from you in parallel with your own response, not after — a partner bleeding from your silence is a relationship and reputation hit.
- **Legal exposure in every word.** External statements are permanent and discoverable; counsel reviews them. "We will make everyone whole" is a financial promise, not a comfort.

---

## Hand-offs

- Roles, contact sheet, and templates prepared in advance → [preparedness.md](preparedness.md).
- Freeze requests to issuers/exchanges (the recovery side of the same contacts) → [recovery-and-negotiation.md](recovery-and-negotiation.md).
- Evidence/dossier to attach to notifications → [fund-tracing-forensics.md](fund-tracing-forensics.md) ⭐.
- Which audiences exist depends on class (off-chain = users first) → [incident-taxonomy.md](incident-taxonomy.md).
- The comms timeline feeds the write-up → [postmortem.md](postmortem.md).
