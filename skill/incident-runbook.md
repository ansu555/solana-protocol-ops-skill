# Incident Runbook — the Decision Tree

> **The playbook for the hour everything is on fire.** Once [incident-taxonomy.md](incident-taxonomy.md) names the class, this file runs the **CONTAIN → ERADICATE** arc: stop the bleeding, then remove the root cause without making it worse. The differentiator is not the happy path — it's the **nasty branches** where teams freeze: the pause is broken, pausing strands *more* funds than letting it ride, you yourself are the compromise, the attacker returns after your "fix." A calm decision tree for those moments is worth more than any monitor.

Use this file when an incident is **active** and the operator asks *"what do I do right now, in what order?"* — or when the obvious move (pause! patch!) might be the wrong one.

This is **defensive / authorized-operator** work. Every irreversible on-chain action (pause, upgrade, key rotation, fund movement) is **confirmed with the operator before execution** — surface the action, the blast radius, and the reversal path, then wait.

---

## The golden order

Do these in sequence. Skipping ahead is how incidents get worse.

```
1. PRESERVE   snapshot state + evidence  (cheap, irreversible loss if skipped)
2. ASSESS     class + blast radius + is action net-positive?
3. CONTAIN    smallest action that stops the loss   (reversible > total)
4. ERADICATE  remove root cause on a fork first, then mainnet
5. VERIFY     replay the exploit against the fix on Surfpool
6. HAND OFF   recover · comms · post-mortem
```

**Why PRESERVE is step 1.** Containment can destroy evidence — a pause freezes state, an upgrade overwrites the vulnerable code, logs roll off. Before touching anything, capture: the drain tx signatures, current account states of affected vaults, the program's current bytecode/hash, and the invariant snapshot. This is also legal-hold material. It costs seconds and is unrecoverable later. See **Evidence preservation** below.

---

## CONTAIN — stop the bleeding

The principle: **the smallest, most reversible action that halts the loss.** Reach for a scalpel before a sledgehammer.

| Option (least → most drastic) | When | Reversible? | Owner |
|---|---|---|---|
| **Partial pause** (e.g. deposits/borrows off, withdrawals on) | The exploit needs one instruction path; users still need their own funds out | Yes | [pause-guardian.md](pause-guardian.md) |
| **Full pause** | Can't isolate the path, or any further tx risks loss | Yes | [pause-guardian.md](pause-guardian.md) |
| **Sever a dependency** | Dependency class — bad feed / route / bridge | Yes | [incident-taxonomy.md](incident-taxonomy.md) → dependency |
| **Key rotation / proposal veto** | Governance/key class — signer hostile | Partly | [pause-guardian.md](pause-guardian.md) |
| **Drain-to-safe** (move at-risk funds to a secure multisig *yourself*, ahead of the attacker) | Pause is impossible/broken and funds are imminently reachable | Hard to reverse | confirm with operator first |

**Contain checklist (emit filled in):**
- [ ] Evidence snapshot captured *before* the containing action
- [ ] Smallest effective action chosen, with its blast radius stated
- [ ] Reversal path written down *before* executing
- [ ] Operator confirmed the irreversible step
- [ ] Post-action invariant re-check: did the loss actually stop?

---

## ERADICATE — remove the root cause

Containment buys time; it is not a fix. Eradication removes the vulnerability so you can safely unpause.

1. **Root-cause to a single proposition.** From the breached invariant + the drain tx, state the bug as one sentence ("the mint instruction never checks collateral backing"). That sentence is also the seed for [feedback-loop.md](feedback-loop.md).
2. **Fix on a fork first.** Apply the patch in **Surfpool** ([resources.md](resources.md)), never straight to mainnet.
3. **Replay the exploit against the patched program.** Re-run the real drain txs on the fork; assert the breached invariant now holds and the exploit reverts. A fix you haven't replayed is a hypothesis.
4. **Ship through your safe-upgrade path.** Guarded/timelocked upgrade via [pause-guardian.md](pause-guardian.md), not a raw `deploy`.
5. **Unpause incrementally.** Re-enable the smallest surface first, watch the invariants, then widen. Do **not** unpause and walk away.

---

## The nasty branches (where teams freeze)

The happy path is rare. These are the decision trees for the moments that actually decide outcomes.

### A. The pause function is broken / the guardian key is lost
The kill switch you planned to pull doesn't pull. Options, in order:
1. **Alternative chokepoint** — pause a *dependency* you control (oracle updater, a required upstream program), or a guarded admin instruction that still works.
2. **Drain-to-safe** — front-run the attacker: move reachable funds to a secure multisig *yourself*. Irreversible-ish and loud, so confirm with the operator; still beats donating to the attacker.
3. **Social/dependency layer** — ask an exchange to halt deposits of the token, or an oracle provider to stop publishing, buying time off-chain.
The lesson feeds [preparedness.md](preparedness.md): *test the pause in a drill before you need it, and never have a single-key guardian.*

### B. Pausing strands MORE funds than letting it ride ("do nothing is correct")
Sometimes the pause traps users behind a halt while the actual loss is bounded and small. **Compute it:** `expected further loss if live` vs `value stranded / harm done by pausing`. If a $200k exploit is winding down but a pause freezes $50M of healthy user withdrawals, **do nothing on-chain** and manage it through comms + targeted recovery. The reflexive pause is not always net-positive — state the math, don't act on adrenaline.

### C. You are the one compromised (insider / leaked key) mid-incident
If the drain is coming from *your own* authority, the authority cannot be trusted to fix it:
- **Assume every key the compromised party touched is hostile.** Rotate to a fresh, air-gapped multisig.
- **Reduce the bus factor of the response** — the suspected-compromised individual is removed from the war room and from signing.
- **Preserve their access logs** before revoking (evidence).
- Route to [comms-and-coordination.md](comms-and-coordination.md) for the trust-rebuilding disclosure this will require.

### D. Contagion to integrators who compose with you
Other protocols may hold your token, your LP, or call your program. If so:
- Enumerate downstream integrators (who reads your price, holds your asset, CPIs into you).
- **Notify them in parallel with your own containment** — they may need to pause *their* product. A silent fix that lets a partner bleed is a reputational multiplier. → [comms-and-coordination.md](comms-and-coordination.md).

### E. The attacker returns after your "fix"
A patched fork that wasn't replayed, or a second vulnerability of the same class:
- Treat a repeat hit as proof the fix was a **hypothesis**, not a fix — re-pause immediately.
- Re-run eradication with the *replay* step you skipped.
- Check whether the root-cause class has **siblings** elsewhere in the program (same missing check on another instruction). [feedback-loop.md](feedback-loop.md)'s rule should catch the whole class.

### F. Evidence / legal-hold preservation (do this at t=0, not after)
- **Snapshot, don't mutate.** Record drain tx signatures, affected account states, current program hash, and the invariant snapshot before containment alters them.
- **Don't destroy logs.** RPC access logs, deploy history, frontend deploy logs, multisig signer history — all evidence for attribution and any later legal action.
- A chain is immutable but *interpretation* is perishable: capture the parsed, labeled view (`parseTransaction`) now, while the context is fresh.

---

## Worked examples

- **Cashio (exploit/drain).** PRESERVE the fake-mint txs + vault state → CONTAIN by pausing the mint instruction (withdrawals can stay if isolating is safe) → ERADICATE by adding the collateral-backing check, replay the real exploit on a fork to confirm the mint now reverts → VERIFY invariant `cash_supply <= total_backing` holds → HAND OFF to [fund-tracing-forensics.md](fund-tracing-forensics.md) (funds already bridged) + [postmortem.md](postmortem.md).
- **Mango (economic).** No code bug to patch — the lever is **CONTAIN via market halt + widened oracle confidence** (branch B math matters: the loss was realized, so the question is preventing copycats, not freezing everything) → ERADICATE = risk-param + oracle-robustness changes, not a binary patch → recovery is negotiation/governance, not a pause.

---

## Output contract

When this file runs, emit:
1. **Filled golden-order trace** — which steps done, with the action and reversal path for each.
2. **The containing action**, its blast radius, and the net-positive justification (especially if the answer was "do nothing").
3. **Root-cause sentence** — the one-line proposition for [feedback-loop.md](feedback-loop.md).
4. **Fork-replay result** — exploit reverts against the fix: yes/no.
5. **Open nasty-branch flags** — any of A–F in play and the chosen path.
6. **Hand-off list** — recovery, comms, post-mortem.

---

## Edge cases & gotchas

- **Adrenaline over arithmetic.** The reflex to "pause everything" is wrong often enough that you must compute branch B's math every time, not just when it feels close.
- **A fix you didn't replay is a guess.** The single most common cause of branch E (attacker returns) is shipping an un-replayed patch.
- **Containment destroys evidence.** This is why PRESERVE is step 1, not an afterthought — sequence matters more here than anywhere else in the skill.
- **Unpause is an incident too.** Re-enabling is where second exploits land; do it incrementally with invariants watched, never all at once.
- **Irreversibility ladder.** Always prefer partial→full pause (reversible) over drain-to-safe (not) over upgrade (overwrites evidence). Climb only as far as you must.

---

## Hand-offs

- Need to actually execute a pause/rotation/upgrade → [pause-guardian.md](pause-guardian.md).
- Unsure of the class before you start → [incident-taxonomy.md](incident-taxonomy.md).
- Funds have left → [fund-tracing-forensics.md](fund-tracing-forensics.md) ⭐.
- Recovery, freezes, whitehat negotiation → [recovery-and-negotiation.md](recovery-and-negotiation.md).
- Anyone outside the war room needs to hear something → [comms-and-coordination.md](comms-and-coordination.md).
- It's over → [postmortem.md](postmortem.md) → [feedback-loop.md](feedback-loop.md) ⭐ turns the root cause into a build-time rule.
- The whole thing should have been rehearsed → [preparedness.md](preparedness.md).
