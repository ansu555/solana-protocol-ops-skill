# Resources

> **The data engine and the reference shelf.** This skill ships logic, not infrastructure — the data comes from MCPs **already configured in the Solana AI Kit's `.mcp.json`**: **Helius** (on-chain data + webhooks) and **Surfpool** (mainnet-fork replay). This file is the consolidated tool map every other file points back to, plus the build-time hand-off targets and the fixture references.

Use this file for the MCP tool reference, the upstream repos the [feedback-loop.md](feedback-loop.md) ⭐ PRs into, and the historical-exploit fixtures the whole skill validates against.

---

## Helius MCP — the data engine

Already in the kit's `.mcp.json`. The complete tool map used across this skill:

| Need | Helius MCP / RPC | Used by |
|---|---|---|
| Walk an address's tx history | `getTransactionHistory` (parsed) / `getSignaturesForAddress` | [fund-tracing-forensics.md](fund-tracing-forensics.md), [anomaly-detection.md](anomaly-detection.md) |
| Net value delta per tx (the tracing engine) | `getTransaction` → `pre/postBalances` + `pre/postTokenBalances` | [fund-tracing-forensics.md](fund-tracing-forensics.md) |
| Human-readable decoded tx + inner CPIs | `parseTransaction` (enhanced) | tracing, taxonomy, evidence capture |
| Live monitoring (push, not poll) | `createWebhook` / `updateWebhook` / `listWebhooks` / `deleteWebhook` + Enhanced WebSockets / LaserStream gRPC | [invariant-monitoring.md](invariant-monitoring.md), [anomaly-detection.md](anomaly-detection.md) |
| Balances / holdings / account state | DAS API + RPC (`getAccountInfo`, `getTokenAccountsByOwner`) | invariants, impact snapshot |
| Address labels (CEX / bridge / mixer) | known-address lists + wallet-analysis | tracing terminal classification |
| Cluster related attacker wallets | DAS + co-spending / common-funder heuristics | backward attribution |

**Auth:** the RPC URL (with API key) is `HELIUS_RPC_URL` in the kit's environment. Keep all tracing/monitoring keys **read-only** — this skill never needs write authority.

---

## Surfpool MCP — replay & validation

Mainnet-fork replay, already in the kit. The skill's verification backbone:

| Use | How | Used by |
|---|---|---|
| Replay a historical exploit on a fork | fork at the pre-incident slot, re-run the drain txs | [preparedness.md](preparedness.md) drills, [invariant-monitoring.md](invariant-monitoring.md) |
| Validate a detector catches the breach at t=0 | run invariants against the replayed exploit | [invariant-monitoring.md](invariant-monitoring.md) ⭐ |
| Validate a fix reverts the exploit | apply patch on fork, replay the drain, assert revert | [incident-runbook.md](incident-runbook.md), [pause-guardian.md](pause-guardian.md) |
| Trace a *hypothetical* route | fork + simulate "what if funds went via bridge X" | [fund-tracing-forensics.md](fund-tracing-forensics.md) |

> **Note:** forensics on *historical* funds needs **no fork** — mainnet history is immutable and public, so trace against real history directly. Use Surfpool only for hypotheticals and fix-validation. (See [fund-tracing-forensics.md](fund-tracing-forensics.md).)

---

## Build-time hand-off targets (the feedback loop)

[feedback-loop.md](feedback-loop.md) ⭐ mints audit rules in each repo's native format and PRs them upstream. These are **third-party repos** — generate artifacts in their format, don't edit them directly:

| Skill | Artifact format | Repo |
|---|---|---|
| **safe-solana-builder** | security-checklist row + enforced vuln-class bullet | https://github.com/frankcastleauditor/safe-solana-builder |
| **trailofbits** | Semgrep rule (YAML) | https://github.com/trailofbits/skills |
| **qedgen** | `.qedspec` `invariant` / `ensures` clause (Kani + Lean) | https://github.com/QEDGen/solana-skills |

The depth ladder (pattern → property → principle) and the exact artifact templates live in [feedback-loop.md](feedback-loop.md).

---

## Solana primitives referenced

| Thing | What / where |
|---|---|
| **@solana/kit** | the 2026 TS SDK used in this skill's runnable artifacts (`createSolanaRpc`, `address`, `signature`) |
| **Squads** | multisig + timelock for guardian/upgrade authority — https://squads.so |
| **BPFLoaderUpgradeable** | the upgradeable-program model for guarded upgrades |
| **Token-2022** | confidential-transfer + extension edge cases in tracing |
| **Pyth / Switchboard** | oracle providers — confidence bands, staleness checks |
| **Wormhole / Allbridge / deBridge / Mayan / Portal** | bridges — VAA payloads carry the destination chain + address for hand-off |
| **Circle (USDC) / Tether (USDT)** | issuer-level freeze of blacklisted addresses — the score-3 recovery lever |

---

## Historical-exploit fixtures

The two reproducible test cases the whole skill validates against — different classes on purpose:

| Exploit | Date | Loss | Class | Exercises |
|---|---|---|---|---|
| **Cashio** | Mar 2022 | ~$48M | exploit/drain | invariant monitoring (caught at t=0), value/bridge tracing, recovery split |
| **Mango Markets** | Oct 2022 | ~$116M | economic (manipulation) | economic detection, backward attribution, do-nothing math |

---

## Related skills in the kit

| Skill | Relationship |
|---|---|
| **helius** (MCP) | the data engine this skill runs on |
| **surfpool** (MCP) | the replay/validation engine |
| **safe-solana-builder / trailofbits / qedgen** | build-time security — this skill's feedback loop PRs rules upstream to them |
| **solana-dev** (`/debug-user-tx`) | single-tx debugging — delegate there for individual user-tx issues |

---

## Hand-offs

- This is reference-only; every operational file links back here for the tool map.
- The MCP configs themselves live in the kit's `.mcp.json`, not in this repo.
