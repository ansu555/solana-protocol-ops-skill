# Validation fixtures

> **Proof, not prose.** The skill's detectors run against **real exploits** that
> are permanently on-chain — anyone with an archive RPC can reproduce the results.
> Each run writes a **committed proof artifact** (captured output of an actual run).

### Evidence at a glance

| Fixture | What it proves | On real data? | Proof artifact |
|---|---|---|---|
| **Cashio forward trace** | Value-not-token tracing through a Saber swap (a substitution, not a dead end) | ✅ immutable mainnet history | `cashio-trace.json` |
| **Mango backward trace** | Backward attribution to a labeled CEX (recovers a *name*) | ✅ immutable mainnet history | `mango-trace.json` |
| **Invariant monitor** | The shipped monitor fires SEV1 on the breach *condition* | ✅ local Surfpool surfnet (no key, no fork) | `invariant-surfpool.json` |

Two kinds of fixture:

- **Forensics fixtures** run the shipped engine against **immutable mainnet
  history**, so no fork is needed (see
  [`../skill/fund-tracing-forensics.md`](../skill/fund-tracing-forensics.md)).
- **The invariant fixture** reconstructs the Cashio breach on a **local Surfpool
  surfnet** via cheatcodes and asserts the shipped monitor fires (see
  [`../skill/invariant-monitoring.md`](../skill/invariant-monitoring.md)).

## What's here

| File | Role |
|---|---|
| `trace.ts` | Forward fund-tracing engine — net **actor-delta** per tx (`@solana/kit`). |
| `backward.ts` | **Backward attribution** engine — walks inflows back to a funding entity. |
| `monitor.ts` | Runnable **invariant runner** — evaluates a declarative spec against any RPC (safe bigint evaluator, no `eval`). |
| `cheats.ts` | Thin client for Surfpool's `surfnet_*` cheatcodes (set mint supply / token balances). |
| `run-cashio.ts` | Cashio driver: the Saber swap is a **substitution, not a hop** (forward / value-not-token). |
| `run-mango.ts` | Mango driver: **backward** funding trace reaches a labeled CEX → attribution. |
| `run-invariant-surfpool.ts` | Crown-jewel-#1 driver: cheatcode-seed `supply==backing`, fire 2B unbacked mint, assert **SEV1 breach**. |
| `find-cashio-drain.ts` / `inspect-cashio.ts` | Cashio discovery (mint-supply jump → attacker → swap leg). |
| `find-mango-funding.ts` | Mango discovery (walk funding backward to fill `mango.seeds.json`). |
| `*.seeds.json` / `invariants.cashio.json` | Real coordinates / the reviewable invariant spec. |
| `cashio-trace.json` / `mango-trace.json` / `invariant-surfpool.json` | **Committed proof artifacts — captured output of actual runs.** |
| `out/` | Ephemeral run/discovery logs (gitignored). |

---

## 1. Cashio — forward / value-not-token (immutable history)

`actorDelta` on the real Saber leg returns `{ CASH: negative, stablecoin:
positive }` for one actor — a swap a token-only trace would misread as a dead
end. Cashio is **March 2022**, so you need an **archive** RPC:

```bash
cd fixtures && npm install
HELIUS_RPC_URL="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY" npm run trace:cashio
```

Committed result `cashio-trace.json`: drain `4fgL8D…` mints `+2,000,000,000 CASH`;
Saber swap `3qeUYN…` (93s later) is `−1,972,506,869 CASH` and `+17,041,006 USDC`
+ `+8,646,022 UST(Wormhole)` in **one tx** — `substitution: true`.

## 2. Mango — backward attribution (immutable history)

The Mango funds largely stayed identifiable on Solana, so the leverage is the
*other* direction: from the attacker account, walk **inflows backward** to a
KYC'd CEX withdrawal — the trace that recovers a **name**.

`mango.seeds.json` ships with the real, discovery-verified coordinates: attacker
owner EOA `yUJw9a…` (Eisenberg's MangoAccount1 owner) and funding terminal
`6ZRCB7…` (a labeled FTX hot wallet). Reproduce:

```bash
# discover: walk funding backward from the attacker account
HELIUS_RPC_URL=... node --import tsx find-mango-funding.ts <ATTACKER_ACCOUNT>
# run the proof (seeds already filled)
HELIUS_RPC_URL=... npm run trace:mango      # writes mango-trace.json
```

Committed result `mango-trace.json`: the backward trace reaches a labeled funding
entity in **1 hop** — `yUJw9a…` was funded `+24,838.2 USDC` by FTX `6ZRCB7…` at
`2022-10-11T19:36:47Z`, ~2.5h before the ~22:19Z exploit
(`reachedLabeledTerminal: true`, `fundingTerminal: FTX`). The trace recovers a
**name**, not funds — the deliberate contrast to Cashio's forward/value trace.
(Needs the same archive RPC; Mango is Oct 2022.)

## 3. Invariant monitor — Surfpool synthetic reconstruction (no key, no fork)

Crown jewel #1. We do **not** fork 2022 mainnet (archive-state limits make that
brittle). We reconstruct the breach *condition* from scratch on a local surfnet
using cheatcodes, and assert the shipped `monitor.ts` catches it:

```bash
# 1. start a local surfnet (install: brew install txtx/taps/surfpool)
surfpool start --no-tui --no-deploy -y
# 2. in another shell
cd fixtures && npm install
npm run invariant:surfpool                  # writes invariant-surfpool.json
```

The driver seeds `CASH supply == collateral backing` (monitor **green**), then
mints `2,000,000,000` unbacked CASH while the real vault is untouched — the
`cash-solvency` and `collateral-custody` invariants both **breach SEV1** in the
same state. That is the Cashio t=0 catch, before the Saber swap or the bridge.
Committed proof: `invariant-surfpool.json`.

---

## What this proves (and what it doesn't)

**Proves (on real data / real tooling):** the forward value-trace, the backward
attribution walk, and that the invariant monitor actually fires on the breach it
claims to catch.

**Still analyst-curated (not auto-faked):** USD-at-slot pricing and entity
labels in the forensics dossiers; the Mango `attacker`/`terminals` coordinates
(filled from a discovery run or public reporting, never invented). The invariant
fixture is a faithful reconstruction of the breach *condition* — it validates the
detector, not the exact 2022 account set.
