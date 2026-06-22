# Pause Guardian — CONTAIN Phase

> **The brake pedal — and the discipline to use the right amount of it.** When [incident-runbook.md](incident-runbook.md) calls for containment, this file is *how you actually stop the protocol* without stopping more than you must. The Solana-specific mechanics: circuit breakers and kill switches, **partial pause** (deposits off / withdrawals on), guarded `BPFLoaderUpgradeable` upgrades, and **Squads multisig + timelock** operations. The recurring lesson: a pause you can't reach, can't scope, or can't reverse is barely a pause at all.

Use this file when the operator needs to **execute** a halt, rotate a key, veto a proposal, or ship a guarded upgrade — and when *designing* these controls before an incident (the cheaper time to do it).

This is **defensive / authorized-operator** work. A pause, upgrade, key rotation, or fund move is **irreversible or high-impact — confirm the exact action, its blast radius, and its reversal path with the operator before signing.**

---

## The containment ladder (least → most drastic)

Match the smallest control to the threat. Climbing the ladder needlessly *is* an incident.

| Control | Stops | Leaves working | Reversible | Use when |
|---|---|---|---|---|
| **Parameter throttle** (lower caps, widen oracle confidence, raise fees) | abuse that scales with size | everything else | Yes | economic pressure, slow leak |
| **Partial pause** (per-instruction flag) | the exploited path only | user withdrawals, healthy ops | Yes | you can isolate the bad instruction |
| **Full pause** (global halt flag) | all state-changing instructions | reads only | Yes | can't isolate, or any tx risks loss |
| **Dependency cutoff** (stop trusting a feed/route) | dependency-class damage | everything not using that dep | Yes | bad oracle/route/bridge |
| **Key rotation / proposal veto** | a hostile authority | the rest of governance | Partly | governance/key class |
| **Guarded upgrade** (patch + redeploy) | the root cause | — (overwrites code) | No (overwrites evidence) | eradication, after fork-replay |

**Partial pause is the most under-used and most valuable.** "Deposits and borrows off, withdrawals on" stops an exploit that needs to *add* a position while letting honest users exit — it contains the attack without trapping the people you're protecting. Design your pause flags **per sensitive instruction**, not one global boolean, precisely so this option exists.

---

## Designing pausability into the program (PREPARE, but lives here)

The best pause is the one wired in before launch. The patterns:

- **A `paused` state per instruction class**, checked at the top of each handler — not a single global flag. Granularity is what makes partial pause possible.
- **A dedicated guardian authority** separate from the upgrade authority and the treasury — least privilege, so a guardian-key leak can pause/grief but not drain or upgrade.
- **A reversible halt**, never a self-destruct. Pausing must be undoable by the same authority; never ship a one-way kill.
- **A break-glass path** that is *fast* (guardian can pause in one signature) paired with an *unpause* that is *slower/quorum'd* (so a compromised guardian can't toggle freely). Asymmetric by design: easy to stop, deliberate to resume.
- **An on-chain event on pause/unpause** so [comms-and-coordination.md](comms-and-coordination.md) and integrators see state changes without asking.

---

## Squads multisig + timelock operations

Most live Solana protocols hold admin authority in a **Squads** multisig, often with a timelock. The incident-time mechanics:

- **Pre-position a "break-glass" transaction.** A pre-built, pre-reviewed pause tx sitting in the multisig ready to sign turns a 30-minute scramble into a 2-minute signature collection. Build it during PREPARE.
- **Know your quorum's real-world latency.** A 4-of-7 across timezones at 3am is the actual bottleneck — measure it in a drill ([preparedness.md](preparedness.md)). The math in [incident-runbook.md](incident-runbook.md) branch A assumes you know this number.
- **Timelock is a double-edged sword.** It protects against a malicious upgrade but *delays your own emergency fix*. The resolution: keep the **pause** outside the timelock (instant guardian action) and the **upgrade** inside it (deliberate). Never gate the brake behind the same delay as the engine swap.
- **Veto path for malicious proposals.** Governance/key class: if a malicious proposal is in the timelock window, the containing action is the **veto/cancel**, executed before it matures — confirm the proposal ID and the cancel authority.

---

## Guarded upgrades (ERADICATE hand-back)

When [incident-runbook.md](incident-runbook.md) reaches eradication, the redeploy comes back here:

1. **Fork-replay first.** Never upgrade mainnet with a patch that hasn't reverted the real exploit on Surfpool ([resources.md](resources.md)).
2. **Upgrade via the timelocked multisig**, not a raw `solana program deploy` from a hot key.
3. **Verify the deployed hash** matches the audited artifact (the build-time skills' reproducible-build output) — an upgrade is a perfect place to slip in a second compromise.
4. **Keep the program paused through the upgrade**, then **unpause incrementally** (smallest surface first, invariants watched).
5. **Preserve the pre-upgrade bytecode hash** — eradication overwrites the vulnerable code, which is evidence ([incident-runbook.md](incident-runbook.md) branch F).

---

## When containment itself fails

Routes straight to [incident-runbook.md](incident-runbook.md) branch A, but the controls live here:

- **Guardian key lost/unreachable** → fall back to any *other* authority you hold (treasury, a dependency you control), or drain-to-safe.
- **Pause instruction has a bug** → you can't fix it without an upgrade, but the upgrade authority can sometimes deploy a one-instruction "pause-only" patch faster than a full fix.
- **Single-key guardian compromised** → it can pause *and* unpause hostilely; rotate first, then pause. This is why the unpause should be quorum'd.

---

## Output contract

When this file runs, emit:
1. **The chosen control** + its rung on the ladder, with the blast radius named.
2. **The exact transaction(s)** to sign (program, instruction, accounts, authority) — ready for the multisig.
3. **The reversal path** — how to undo this, and who can.
4. **Quorum/timelock reality** — signatures needed and realistic latency.
5. **Post-action invariant re-check** — confirm the loss actually stopped ([invariant-monitoring.md](invariant-monitoring.md)).

---

## Edge cases & gotchas

- **A global boolean pause is a design smell.** It forces you to choose between "trap everyone" and "stop nothing." Per-instruction flags are the whole point.
- **The brake behind the timelock.** The most common fatal misconfiguration: emergency pause gated by the same delay as upgrades. Pause must be instant.
- **Single-key guardian.** One key that can pause *and* unpause is a griefing and ransom vector. Asymmetric authority (fast pause / quorum unpause) closes it.
- **Upgrade ≠ safe by default.** A guarded upgrade overwrites evidence and is a slot to inject a second bug — verify the hash, preserve the old one.
- **Pausing a healthy protocol is harm.** Always check [incident-runbook.md](incident-runbook.md) branch B (do-nothing math) before halting; containment is not automatically net-positive.

---

## Hand-offs

- Deciding *whether/what* to contain → [incident-runbook.md](incident-runbook.md) (the decision tree owns the call; this file owns the mechanics).
- Which class needs containment → [incident-taxonomy.md](incident-taxonomy.md).
- Confirm the loss stopped after pausing → [invariant-monitoring.md](invariant-monitoring.md) ⭐.
- The pause/unpause should be rehearsed and the quorum latency measured → [preparedness.md](preparedness.md).
- Announce the pause to users/integrators → [comms-and-coordination.md](comms-and-coordination.md).
