# Incident Taxonomy — TRIAGE Routing

> **The fork in the road.** TRIAGE is the one step where a single wrong turn costs the whole response. Classification is not labeling — it **picks the runbook and starts the clock**. Treat a live drain as an "economic blip" and you burn the containment window; slam the pause on a market depeg you've mistaken for a drain and you strand funds for no reason. Classify from the **on-chain evidence**, not the alarm that fired or the panic in the channel — first reports are almost always wrong about *cause*.

Use this file when the operator asks *"what kind of incident is this?"*, when an alert fired and the class is unclear, or **before** running any class-specific runbook — taxonomy comes first because every downstream file assumes you already know the class.

This is **defensive / authorized-operator** work: classify to respond, never to exploit.

---

## It is not all drains

The single biggest triage error is assuming every incident is an exploit. Five classes, five different runbooks, five different clocks. The class you land on determines *what you do in the next five minutes*.

| Class | What it is | The tell (on-chain) | Clock | First containment move | Routes to |
|---|---|---|---|---|---|
| **Economic** | The code ran **as written**, but market/price inputs drove it into an unhealthy state (incl. manipulation). | Bounds invariants breach (LTV, oracle band, depeg); every instruction is **authorized + valid**. | Minutes–hours (cascades compound) | Pause the affected market; widen oracle confidence / halt liquidations | [incident-runbook.md](incident-runbook.md), [pause-guardian.md](pause-guardian.md) |
| **Exploit / drain** | An **unauthorized or impossible** state transition — value left without a legitimate path. | Conservation/solvency invariants break **discretely at t=0**; a mint/withdraw that shouldn't be reachable. | **Seconds–minutes** | Pause/kill the exploited instruction *now* | [incident-runbook.md](incident-runbook.md), [pause-guardian.md](pause-guardian.md), [fund-tracing-forensics.md](fund-tracing-forensics.md) ⭐ |
| **Dependency** | Your code is fine; an **external** component failed or was compromised. | Failures correlate with an outside program/feed (Pyth stale, Jupiter route reverts, bridge drained, RPC/Helius down, congestion). | Minutes–hours | Switch/sever the dep; pause anything that *trusts* it | [incident-runbook.md](incident-runbook.md), [pause-guardian.md](pause-guardian.md) |
| **Governance / key** | An **authorized-but-illegitimate** action — a valid signature from a key that shouldn't be acting. | The action **passes every on-chain check**; the authorization itself is the compromise (signer leak, upgrade-authority theft, malicious proposal). | Hours (timelock) → instant (if no timelock) | Rotate keys / veto the proposal / pause upgrades; assume the signer is hostile | [pause-guardian.md](pause-guardian.md), [recovery-and-negotiation.md](recovery-and-negotiation.md) |
| **Off-chain / frontend** | **Nothing is wrong on-chain.** DNS hijack, site serving a wallet-drainer, malicious npm dep — users sign malicious txs *themselves*. | Your program state is **clean**; individual *user* wallets drain via signatures they made on your site. | **Minutes** (every page-load is a new victim) | Pull/replace the frontend, lock DNS, warn users to revoke | [comms-and-coordination.md](comms-and-coordination.md), [incident-runbook.md](incident-runbook.md) |

---

## The classifying axis: authorized vs legitimate

Three of the five classes separate cleanly on two questions — **was the on-chain action authorized** (did it pass the program's checks), and **was it legitimate** (was it supposed to happen):

| | **Legitimate** | **Illegitimate** |
|---|---|---|
| **Authorized** (passes checks) | normal operations · or **Economic** (code did as told under bad/gamed inputs) | **Governance / key** — the dangerous quadrant: it looks perfectly valid on-chain |
| **Unauthorized** (shouldn't be possible) | — | **Exploit / drain** |

Two classes fall outside this grid: **Dependency** (the failure isn't your action at all — it's an external component) and **Off-chain** (the action is the *user's own* signature, made off your program entirely). The authorized-and-legitimate-looking **governance/key** quadrant is the trap: nothing in the protocol's own logic flags it, because the attacker is using a real key. Detect it by the *identity* and *context* of the signer, never by instruction validity.

---

## The triage procedure (first five minutes)

Work top-down; the first match wins, but keep checking — incidents can be **multi-class** (see edge cases).

1. **Is your program state actually wrong?** Pull the invariants ([invariant-monitoring.md](invariant-monitoring.md)). If every protocol invariant holds but users report drained wallets → **Off-chain / frontend.** Stop and go there; do not pause the protocol, the protocol is fine.
2. **Did value leave via a path that shouldn't exist?** A mint without backing, a withdraw exceeding deposits, `sum(user_balances) != vault` — a *conservation/solvency* breach with no legitimate instruction behind it → **Exploit / drain.** Fastest clock; contain first, classify the sub-type later.
3. **Was the damaging action fully authorized but wrong?** It passed every check, but the signer/authority/proposal shouldn't have done it → **Governance / key.** Treat the key as hostile; rotation, not pause, is the lever.
4. **Did an external component fail or get compromised?** The trigger correlates with an outside feed/program/route/RPC, not your instructions → **Dependency.** Sever or switch the dep.
5. **Did the code do exactly what it was told, under bad or manipulated inputs?** Prices moved, positions went underwater, bad debt accrued — *bounds* invariants breach but instructions are valid → **Economic.**

**TRIAGE checklist (emit this filled in):**
- [ ] Invariant snapshot pulled — which breached, which hold
- [ ] Protocol state vs user wallets: is the loss in your accounts or in users' own wallets?
- [ ] Damaging action: authorized or not? Legitimate or not?
- [ ] External dependencies checked (oracle freshness, route health, bridge state, RPC)
- [ ] Class assigned **+ confidence + the evidence** (not just a label)
- [ ] Multi-class / class-shift risk flagged
- [ ] Routed to the class's runbook with the clock stated

---

## Disambiguating the hard pairs

Most incidents are obvious. These three pairs are where teams misclassify:

- **Economic vs Exploit.** The discriminator is *authorization*, not *damage*. Mango lost $116M with every instruction authorized and valid — the attacker moved a real oracle with real capital and borrowed against the inflated mark. The code did exactly what it was coded to do → **economic** (manipulation sub-type), even though it was an attack. Cashio's fake-collateral mint was an *impossible* state transition → **exploit.** Ask "could the program, as written, have refused this?" If no (it was authorized) → economic; if it *should* have refused but didn't → exploit.
- **Dependency vs Economic.** A stale Pyth feed and a genuine market crash both look like a depeg. Discriminator: is a **specific external component malfunctioning** (feed not updating, route reverting) → dependency; or is the **market genuinely moving** and your risk logic mishandling it → economic. Check the dep's own health first — it's a one-call disqualifier and changes the eradication entirely (switch the feed vs. adjust risk params).
- **Governance/key vs Exploit.** Both end in "funds gone," but the on-chain signature tells them apart. If the drain came from an instruction that **passed all checks because a legitimate authority signed it** → governance/key (the key is the vulnerability). If it came from an instruction that **bypassed checks** → exploit (the code is the vulnerability). This decides whether you rotate keys or patch the program.

---

## Off-chain / frontend — the class everyone misses

Flagged in the scope map as **the most common real user-fund-loss vector, with zero coverage in v0.** It barely touches your program, which is exactly why on-chain monitoring never catches it.

**The tell:** your protocol invariants are pristine, but users are losing funds. The losses are in *individual user wallets*, drained by transactions **the users signed themselves** — a `setAuthority`, a `Token::approve`, or a transfer to an attacker — after visiting your site. The attacker didn't break your program; they replaced what your *frontend* asked users to sign.

**Common vectors:** DNS/registrar hijack pointing your domain at a malicious clone; a compromised hosting/CDN deploy; a malicious or hijacked npm dependency in the dApp bundle (supply-chain); a leaked deploy key. The wallet-drainer swaps the legitimate transaction for a drain at signing time.

**Immediate actions (minutes matter — every page load is a fresh victim):**
1. **Take the frontend down or revert to a known-good build** — a maintenance page beats a drainer.
2. **Lock DNS / registrar**, audit recent records and deploy history, rotate deploy + registrar keys.
3. **Warn users loudly** ([comms-and-coordination.md](comms-and-coordination.md)) — "do not sign anything on our site," with revoke instructions for approvals already granted.
4. **Diff the served bundle** against your last trusted build; pin and re-audit dependencies.

The on-chain protocol may need *no* action at all. The trap is the team that pauses the (healthy) program and never looks at the frontend.

---

## Worked examples (classify the fixtures)

- **Cashio (Mar 2022, ~$48M) → Exploit / drain.** The solvency invariant `cash_supply <= total_backing` broke **discretely at t=0** the instant fake collateral minted unbacked CASH — an impossible state transition the program should have refused. Authorization: *unauthorized* (checks bypassed). Clock: seconds. Route: contain the mint instruction → [fund-tracing-forensics.md](fund-tracing-forensics.md).
- **Mango Markets (Oct 2022, ~$116M) → Economic (manipulation).** Every instruction was authorized and valid; the attacker used real capital to move the MNGO oracle, then borrowed against the inflated collateral exactly as the code allowed. *Bounds* invariants (collateral value, oracle deviation) breached; *conservation* held instruction-by-instruction. Authorization: authorized + illegitimate-outcome. Route: halt the market, widen oracle confidence → [incident-runbook.md](incident-runbook.md); the forensic leverage is **backward attribution** (the funding CEX doxxed the attacker).
- **A stale Pyth feed driving a false depeg → Dependency, not Economic.** Same surface symptom as Mango's bad mark, but the root is an external feed that stopped updating. One health check on the feed's last-update slot disambiguates, and the fix is "switch/sever the feed," not "adjust risk params."

The two real fixtures land in two different classes on purpose — that is what exercises the taxonomy. Replay either on a fork with **Surfpool** ([resources.md](resources.md)) to confirm the class from the on-chain evidence rather than from memory.

---

## Class is not severity

Classification (what *kind*) is orthogonal to severity (how *bad*). A SEV1 can be any class; an off-chain drainer can be more costly than an exploit. Assign **both**: class routes the runbook, SEV sets the escalation and who you wake up. SEV criteria and war-room thresholds live in [preparedness.md](preparedness.md).

---

## Output contract

When this file runs, emit a **classification verdict**, not a guess:

1. **Filled TRIAGE checklist.**
2. **Class + confidence** (e.g. `exploit/drain, high`) — and the **evidence** that decided it (which invariant, authorized-or-not, dependency health).
3. **The clock** — the time-pressure for this class, stated explicitly.
4. **First containment move** — the single next action, with the file that owns it.
5. **Routing** — the downstream skill file(s) for this class.
6. **Multi-class / shift flags** — any secondary class, and what would reclassify it.

---

## Edge cases & gotchas

- **Multi-class incidents.** A drain *through* a compromised bridge is both **dependency** (the bridge) and **exploit** (your loss). Classify by the action you can take: contain on the exploit clock, eradicate on the dependency root. Don't force a single label when two runbooks both apply.
- **Class shift over time.** An **economic** wobble invites opportunists — a depeg can become an active **exploit** as bots pile in. Re-triage on a clock; the class at t=0 is not always the class at t+10min.
- **The "no incident" case.** A legitimate large withdrawal or a scheduled treasury move can trip the same alarms as a drain. Before declaring, confirm the action wasn't authorized-and-expected — a false positive that triggers a pause is itself an incident.
- **Premature commitment.** Naming the class too early makes you tunnel and ignore disconfirming evidence. Assign a class *with a confidence*, and keep the runner-up live until the evidence is decisive.
- **Authorized ≠ safe.** The governance/key quadrant exists precisely because "it passed all checks" is not exoneration. If an authorized action did something it never should have, suspect the authority, not the code.

---

## Hand-offs

- Class is **exploit/drain** or **economic** → [incident-runbook.md](incident-runbook.md) for the decision tree; [pause-guardian.md](pause-guardian.md) to contain.
- Class is **off-chain/frontend** → [comms-and-coordination.md](comms-and-coordination.md) first (warn users); the protocol may need no on-chain action.
- Class is **governance/key** → [pause-guardian.md](pause-guardian.md) (rotate/veto/halt upgrades), then [recovery-and-negotiation.md](recovery-and-negotiation.md).
- Funds have moved → [fund-tracing-forensics.md](fund-tracing-forensics.md) ⭐ to trace and score freeze-actionability.
- Unsure whether anything is wrong at all → [invariant-monitoring.md](invariant-monitoring.md) ⭐ / [anomaly-detection.md](anomaly-detection.md) to confirm a real breach before declaring.
- After the dust settles → [postmortem.md](postmortem.md); the *class* is the first field of the write-up and feeds [feedback-loop.md](feedback-loop.md) ⭐.
