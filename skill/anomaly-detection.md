# Anomaly Detection — DETECT Phase

> **The fuzzy net behind the hard wall.** [invariant-monitoring.md](invariant-monitoring.md) ⭐ is the high-signal detector — a breached invariant is a *certainty*, not a guess. This file is the **complement**: heuristics and baselines that catch what no invariant covers — the novel exploit you didn't predict, the slow leak under the threshold, the suspicious *pattern* before any hard rule trips. Invariants tell you the house rules were broken; anomaly detection tells you someone is rattling the windows.

Use this file when the operator asks *"is something off?"* and there's no specific invariant for it, when designing **defense in depth** beyond invariants, or to add the behavioral signals (new attacker wallet, abnormal volume, sudden contract interaction) that front-run a breach.

This is **defensive / authorized-operator** monitoring of your own protocol.

---

## Why both layers exist

| | Invariant monitoring | Anomaly detection |
|---|---|---|
| **Question** | "Did a rule I defined break?" | "Does this look unlike normal?" |
| **Signal** | Binary, certain (supply > backing) | Probabilistic, needs a threshold |
| **Catches** | Known, derivable failure modes | Novel exploits, pre-breach buildup, slow leaks |
| **False positives** | ~none | inherent — must be tuned |
| **When it fires** | At the moment of breach (t=0) | Often *before* (recon/buildup) or *after* (drift) |

Invariants are the wall; anomalies are the motion sensors outside it. **Lead with invariants** (act on them with confidence); use anomalies to **widen coverage and buy early warning**, and to **escalate to a human** rather than auto-act.

---

## The signal catalog

Each is a baseline + a deviation. Establish the baseline from healthy history; alert on the deviation.

| Signal | Normal | Anomalous | What it often means |
|---|---|---|---|
| **TVL / vault balance velocity** | gradual | sharp drop in N slots | drain in progress |
| **Withdrawal size vs. history** | bounded distribution | a single tx >> p99 | whale exit *or* exploit |
| **New-address interaction** | mostly known wallets | brand-new, freshly funded wallet calling a sensitive instruction | exploit recon / launch |
| **Instruction-mix shift** | typical call ratios | a rarely used instruction suddenly dominant | targeting a weak path |
| **Failed-tx spike on a program** | low | burst of reverts | attacker probing / fuzzing on-chain |
| **Oracle/price deviation** | within confidence band | cross-source divergence | manipulation or stale feed (→ economic/dependency) |
| **Gas-payer clustering** | varied | many txs from one fresh funder | coordinated / scripted attack |
| **Time-of-day** | protocol's usual pattern | high-value action at an off-hours dead zone | deliberate low-witness timing |

No single signal is proof. **Correlate**: a fresh wallet + an unusual instruction + a TVL dip in the same window is a far stronger trigger than any one alone.

---

## Baselines without overfitting

- **Derive from healthy history, not a fixed constant.** Pull a trailing window via `getTransactionHistory` and compute the distribution (median, p99) per signal. A hardcoded "$1M is big" is wrong for every protocol but one.
- **Robust statistics.** Use median + MAD or percentiles, not mean + stddev — crypto distributions are fat-tailed and a mean is dragged by legitimate whales.
- **Account for regime changes.** A token listing, an incentive program, or a market crash shifts every baseline. Re-baseline on known events so you don't alert on your own launch.
- **Tier the response by confidence.** Soft signal → log + watch; correlated signals → page a human; correlated signals **+ a breached invariant** → that's not an anomaly anymore, it's an incident → [incident-taxonomy.md](incident-taxonomy.md).

---

## Runnable artifact (`detect.ts`, `@solana/kit`)

A baseline-and-deviation checker you run on a schedule or off a Helius webhook. Ships the structure; the per-protocol thresholds are derived at watch time.

```ts
import { createSolanaRpc, address } from "@solana/kit";

const rpc = createSolanaRpc(process.env.HELIUS_RPC_URL!); // kit's Helius RPC

// Build a robust baseline from healthy history, then score new activity against it.
async function baseline(program: string, lookbackSlots: number) {
  const sigs = await rpc.getSignaturesForAddress(address(program), { limit: 1000 }).send();
  const sizes: number[] = [];        // per-tx net value moved
  const callers = new Map<string, number>();
  for (const s of sigs) {
    const v = await txNetValue(s.signature);     // reuse forensics' actorDelta engine
    sizes.push(v);
    countCaller(callers, s.signature);
  }
  return { p99: percentile(sizes, 99), median: median(sizes), known: callers };
}

// Score one new tx; return correlated reasons, not a single bool.
function score(tx: ParsedTx, base: Baseline): string[] {
  const reasons: string[] = [];
  if (tx.netValue > base.p99) reasons.push(`size > p99 (${tx.netValue})`);
  if (!base.known.has(tx.payer) && tx.touchesSensitive) reasons.push("fresh wallet on sensitive instruction");
  if (tx.failedBurst) reasons.push("failed-tx burst (probing)");
  // …oracle divergence, instruction-mix shift, off-hours, gas-payer clustering
  return reasons;   // 0 = quiet · 1 = log · ≥2 correlated = page a human
}
```

Wire it to Helius **enhanced webhooks** for push (see [invariant-monitoring.md](invariant-monitoring.md) for the webhook config pattern) rather than polling.

---

## Validate against fixtures

The same immutable-history trick as forensics. Run the detector over the window *just before* a known exploit and confirm it would have fired early:

- **Cashio** — the fresh attacker wallet + the never-before-used mint path should light up the "new-address + instruction-mix shift" signals *before* the invariant breaks; invariants then catch the breach at t=0. Anomaly = early warning, invariant = certainty.
- **Mango** — the oracle cross-source divergence and the off-distribution position size are the anomaly tells; this is the economic class, so the price-deviation signal is the primary one.

If the detector wouldn't have fired on a documented exploit's lead-up, its thresholds are too loose. Replay on **Surfpool** ([resources.md](resources.md)) for hypothetical variants.

---

## Output contract

1. **The baseline** per signal (median/p99/known-set), with the window it was derived from.
2. **Live score** — correlated reasons per flagged tx, not a lone boolean.
3. **Tiered routing** — log / page / escalate-to-incident, with the confidence that set the tier.
4. **The webhook/cron config** to run it continuously.

---

## Edge cases & gotchas

- **Alert fatigue kills detectors.** A noisy anomaly monitor gets muted, then misses the real thing. Tune for *correlated* signals; a single soft signal should log, not page.
- **Legitimate whales look like exploits.** A large authorized withdrawal trips size signals. Confirm authorization before escalating — this is the taxonomy's "no incident" case.
- **Attackers study your thresholds.** A slow leak kept just under your alert line is a real technique. Pair absolute thresholds with *cumulative* ones (drift over a day), and don't publish your exact limits.
- **Anomaly ≠ incident.** This layer's job is to *raise a hand*, not to auto-pause. Hand a confirmed breach to [incident-taxonomy.md](incident-taxonomy.md); never let a probabilistic signal trigger an irreversible action on its own.

---

## Hand-offs

- A signal correlates into something real → [incident-taxonomy.md](incident-taxonomy.md) to classify, then [incident-runbook.md](incident-runbook.md).
- You can express the failure as a hard rule → promote it into [invariant-monitoring.md](invariant-monitoring.md) ⭐ (a tuned anomaly that becomes provable is strictly better).
- A drain is confirmed → [fund-tracing-forensics.md](fund-tracing-forensics.md) ⭐.
- Setting this up pre-incident → [preparedness.md](preparedness.md) for who watches the alerts and when they page.
