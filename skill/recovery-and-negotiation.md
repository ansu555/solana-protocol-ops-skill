# Recovery & Negotiation — RECOVER Phase

> **Turning a trace into recovered funds and whole users.** [fund-tracing-forensics.md](fund-tracing-forensics.md) ⭐ produces a ranked, scored ledger: *frozen-able now / liquid / bridged / gone*. This file acts on it — fire the **issuer freezes** that the score-3 terminals enable, open a **whitehat negotiation** for the liquid-but-unfreezable funds, and design the **reimbursement** that makes affected users whole regardless of how much comes back. The forensics file finds the money; this one gets as much of it back as the situation allows and fairly distributes the rest.

Use this file when the operator asks *"can we freeze any of it?"*, *"should we offer the attacker a bounty?"*, or *"how do we make users whole?"* — i.e. after containment, with a trace in hand.

This is **defensive / authorized-operator** work: recover through the parties empowered to act (issuers, exchanges, law enforcement) and through legitimate negotiation. **Never move attacker funds yourself, never "hack back."**

---

## The three recovery levers (run in parallel)

| Lever | Targets | Speed | Who acts |
|---|---|---|---|
| **Issuer / exchange freeze** | score-3 terminals (USDC/USDT in EOA, CEX deposits) | hours — fastest, time-critical | Circle / Tether / exchange compliance, via you + LE |
| **Whitehat negotiation** | score-2 liquid funds, attacker-controlled | days | the attacker, via on-chain message |
| **Reimbursement** | the remaining gap (gone/bridged) | weeks | the protocol / treasury / governance |

These are not sequential — the freeze clock is **hours** (the attacker is racing to swap stablecoins to volatile to escape it), so freeze requests fire *immediately* while negotiation and reimbursement design proceed in parallel.

---

## Freeze actionability — act on the score-3 terminals first

This is the most time-sensitive recovery action and the one most teams don't know they have.

- **Circle (USDC) and Tether (USDT) freeze at the issuer level.** Both maintain on-chain blacklists and *will* freeze blacklisted addresses on a credible law-enforcement request. Any stolen value sitting as USDC/USDT in an EOA is **recoverable right now** — surface those addresses and amounts first, with the exact figures from the trace ledger.
- **The clock is why attackers swap fast.** Every minute funds sit as a stablecoin is a minute they can be frozen; sophisticated attackers swap stablecoin → volatile → bridge as fast as possible. Your freeze request must beat that, which is why it fires the instant the trace flags a score-3 stablecoin terminal.
- **CEX deposit addresses** — the exchange can freeze the account *and* holds KYC. Route to the exchange's compliance/abuse desk ([comms-and-coordination.md](comms-and-coordination.md) holds the contact sheet); attach the dossier and tx evidence.
- **Always via law enforcement where required.** Issuer freezes generally need an LE referent (IC3 report / case number). File it early so the freeze request isn't blocked on paperwork.

**Freeze checklist (emit filled in):**
- [ ] Every score-3 terminal listed with address, token, amount
- [ ] Issuer (Circle/Tether) vs. exchange routing decided per terminal
- [ ] LE referral / IC3 filed (or in progress) for issuer requests
- [ ] Request packet sent with dossier + tx evidence
- [ ] Bridged branches handed to destination-chain analysts ([fund-tracing-forensics.md](fund-tracing-forensics.md))

---

## Whitehat negotiation (the liquid, unfreezable funds)

For value the attacker controls that no issuer can freeze, the realistic recovery path is a deal: keep a bounty, return the rest. It works more often than teams expect because the alternative for the attacker is laundering a doxxed, watched pile.

**The decision framework:**
- **Bounty size.** The norm is a percentage (commonly ~10%) of recovered funds as a "whitehat bounty," with a safe-harbor framing. Bigger than that buys speed when the funds are otherwise gone; smaller signals strength when you have attribution leverage.
- **Your leverage is the trace.** A precise backward-attribution result (the funding CEX that can name them) is the strongest card — "we know who you are" converts more negotiations than threats. Lead with capability, calmly.
- **Deadline + escalation path.** Offer is open for N days; after that, full LE referral with the attribution dossier. State it once, factually.

**The on-chain negotiation message** — a transaction memo / on-chain message to the attacker address:
```
To the address controlling funds from <protocol> (<date>):
We are treating this as a whitehat opportunity. Return <X%> of funds to
<recovery address> by <deadline> and we will treat the remaining <bounty%>
as a bug bounty with safe harbor — no further action. After <deadline> this
becomes a law-enforcement matter; we have traced the funding source.
Contact: <secure channel>.
```
Confirm every word with the operator and counsel before sending — this is an on-chain, permanent, public legal communication.

---

## Reimbursement design (make users whole)

Recovery is rarely 100%. The gap between loss and recovered funds is closed by a reimbursement plan — and *how* it's designed determines whether users trust the protocol afterward.

1. **Snapshot the affected set.** From the trace + invariant breach, build the exact list of harmed accounts and per-account loss **at the slot of the incident** (not today's price). This snapshot is the source of truth; publish its methodology.
2. **Choose a distribution model:**
   - **Pro-rata** of recovered funds — everyone made whole by the same fraction; simplest, fairest when recovery is partial.
   - **Full reimbursement** from treasury/insurance — if reserves allow; fastest trust repair.
   - **Recapitalization / token** — issue a claim token or recovery token redeemable as the protocol earns/recovers; used when the hole is too big for immediate reserves (e.g. socialized over future revenue).
3. **Account for recovered funds as they arrive.** Freezes and negotiation may return funds *after* the plan launches — design the plan to top up, not to double-pay.
4. **Make claims verifiable.** Users should be able to check their snapshot entry; publish the snapshot + the contract logic.

---

## Worked example: Cashio

The trace ([fund-tracing-forensics.md](fund-tracing-forensics.md)) splits ~$48M into freeze-able / liquid / bridged. Recovery acts on each bucket: **issuer freeze** requests on any USDC/UST score-3 terminals (hours-critical); the documented real outcome — **funds returned to wallets holding under a threshold** — maps exactly to a **whitehat-negotiation** result on the liquid bucket; the bridged-to-Ethereum portion becomes a destination-chain recovery effort + LE referral. Reimbursement covers the residual gap via the chosen model. This is the full lever set running in parallel off one ledger.

---

## Output contract

When this file runs, emit:
1. **Filled freeze checklist** — score-3 terminals routed to issuer/exchange, LE referral status.
2. **The freeze-request packet(s)** — recipient, address, amount, evidence attached.
3. **The whitehat message** (if applicable) — drafted, with bounty %, deadline, and the leverage stated.
4. **Reimbursement plan** — affected-account snapshot (at-slot), distribution model, claim mechanism.
5. **A live recovery ledger** — recovered-so-far vs. outstanding, updated as freezes/negotiation land.

---

## Edge cases & gotchas

- **The freeze window is hours, not days.** A stablecoin terminal not actioned fast becomes a volatile/bridged terminal you can't freeze. This is the single most time-critical recovery action.
- **Negotiation is permanent and public.** An on-chain message to the attacker is a legal communication — counsel-reviewed, calm, factual; never threatening or admitting liability.
- **Price-at-slot, not today, for the snapshot.** Reimbursing at today's price over- or under-pays harmed users and invites disputes.
- **Don't double-pay.** Funds recovered after a reimbursement launches must top up the pool, not pay twice.
- **The defensive boundary holds even in recovery.** You recover through issuers, exchanges, LE, and negotiation — never by seizing attacker funds directly, even when you technically could.

---

## Hand-offs

- The ranked, scored ledger this file acts on → [fund-tracing-forensics.md](fund-tracing-forensics.md) ⭐.
- Exchange/issuer/LE contact sheet and the public messaging → [comms-and-coordination.md](comms-and-coordination.md).
- Bridged funds need destination-chain recovery → hand off per [fund-tracing-forensics.md](fund-tracing-forensics.md)'s EVM continuation.
- The recovery outcome and the snapshot feed the write-up → [postmortem.md](postmortem.md).
- A laundering/escape route that recovery exposed → [feedback-loop.md](feedback-loop.md) ⭐ can mint a detection rule for it.
