# Solana Protocol Ops & Incident Response Skill

A Claude Code skill for the **run-time** operational layer of live Solana protocols — SRE / on-call for what happens *after* you launch. Built for the [Solana AI Kit](https://github.com/solanabr/solana-ai-kit).

> **Status:** ✅ Content-complete. The full lifecycle is written — 13 skill files (3 deep crown jewels + 10 supporting pillars), an orchestrator agent, and 3 workflow commands. Every internal cross-link resolves; each crown jewel ships a fixture-based validation recipe (Cashio + Mango). See [the roadmap](#roadmap).

## The gap this fills

The Solana AI Kit audits a protocol five or more ways **before** launch (`safe-solana-builder`, `trailofbits`, `qedgen`, formal verification, security checklists) and **zero** ways after. Security is exhaustively covered at build-time and empty at run-time. When an exploit fires on mainnet — and they fire constantly — teams improvise with no runbook, no monitoring, no forensics process.

This skill is the missing run-time half: monitoring, detection, incident response, fund-tracing forensics, recovery, and a feedback loop that turns each incident back into a build-time audit rule.

## The lifecycle

```
PREPARE → DETECT → TRIAGE → CONTAIN → ERADICATE → RECOVER → LEARN
                     │
                     └─ routes by incident class
                        (economic · exploit · dependency · governance/key · off-chain/frontend)
```

### Three crown jewels (the differentiators)

1. **Invariant monitoring** — derive a protocol's on-chain invariants from its program and watch them continuously (`cash_supply <= total_backing`, `sum(balances) == vault`, `LTV <= max`). This is the detector that would have caught **Cashio at t=0**.
2. **Fund-tracing forensics** — forward *and* backward tracing, value-not-token through DEX/CPI swaps, bridge hand-off to EVM chains, and **freeze-actionability scoring** per hop (what's still in a freezable CEX or Circle-controlled USDC vs. already gone).
3. **Runtime → build-time feedback loop** — every post-mortem mints a new audit rule in the format of the kit's build-time security skills and PRs it upstream, so the next protocol catches this class at build.

## What's included

| Component | Description |
|-----------|-------------|
| [skill/SKILL.md](skill/SKILL.md) | Entry point — routes the lifecycle spine |
| [skill/invariant-monitoring.md](skill/invariant-monitoring.md) | ⭐ Derive invariants + emit monitor/webhook |
| [skill/fund-tracing-forensics.md](skill/fund-tracing-forensics.md) | ⭐ Forward/backward, value, bridges, freeze scoring |
| [skill/feedback-loop.md](skill/feedback-loop.md) | ⭐ Mint build-time audit rules from a post-mortem |
| [skill/incident-taxonomy.md](skill/incident-taxonomy.md) | TRIAGE: route by incident class |
| [skill/preparedness.md](skill/preparedness.md) | IR plan, SEV criteria, war-room roles, drills |
| [skill/anomaly-detection.md](skill/anomaly-detection.md) | Drain-signature heuristics, baselines |
| [skill/pause-guardian.md](skill/pause-guardian.md) | Circuit breakers, partial pause, multisig/timelock |
| [skill/incident-runbook.md](skill/incident-runbook.md) | The decision tree + nasty edge cases |
| [skill/recovery-and-negotiation.md](skill/recovery-and-negotiation.md) | Whitehat negotiation, freezes, reimbursement |
| [skill/comms-and-coordination.md](skill/comms-and-coordination.md) | Internal + external comms |
| [skill/postmortem.md](skill/postmortem.md) | Auto-filled post-mortem |
| [skill/resources.md](skill/resources.md) | Helius/Surfpool MCP tool map, fixtures, upstream PR targets |
| [agents/incident-commander.md](agents/incident-commander.md) | Orchestrates the full arc |
| [/incident](commands/incident.md), [/trace](commands/trace.md), [/watch](commands/watch.md) | Workflow commands |

## Data engine

Reuses MCPs already shipped in the kit — no new dependencies:

- **Helius MCP** — `getTransactionHistory` (money-graph walking), `parseTransaction`, `createWebhook` (live monitoring), DAS API (balances/holdings), wallet-analysis (attacker profiling).
- **Surfpool MCP** — replay a historical exploit on a mainnet fork to validate a detector or a proposed fix.

## Verification

Verifiable against real, permanently-on-chain exploits as reproducible fixtures — each crown jewel ships the validation recipe:

- **Cashio** (Mar 2022, ~$48M) — infinite mint → Saber → bridge → FTX. Validates invariant monitoring + value/bridge tracing.
- **Mango Markets** (Oct 2022, ~$116M) — oracle manipulation. Validates economic detection + backward attribution.

## Installation

```bash
git clone https://github.com/<your-org>/solana-protocol-ops-skill
cd solana-protocol-ops-skill
./install.sh            # standard: installs to ~/.claude/skills/solana-protocol-ops
# or
./install-custom.sh     # choose personal (~/.claude) vs project (./.claude) install
```

The skill expects the Helius MCP configured (`HELIUS_API_KEY`) and, optionally, Surfpool — both already part of the Solana AI Kit's `.mcp.json`.

### Use within the Solana AI Kit (as a submodule)

```bash
cd solana-ai-kit
git submodule add https://github.com/<your-org>/solana-protocol-ops-skill .claude/skills/ext/solana-protocol-ops
```

## Scope & ethics

Defensive / authorized-operator tooling only: protect your own protocol, trace-and-report stolen funds, and coordinate with exchanges and law enforcement. It does **not** assist with offensive use or "hacking back."

## Roadmap

- [x] Repo structure + `SKILL.md` routing spine
- [x] Crown jewel #1: invariant monitoring
- [x] Crown jewel #2: fund-tracing forensics
- [x] Crown jewel #3: runtime → build-time feedback loop
- [x] Supporting lifecycle files (taxonomy, runbook, pause, prepare, recovery, comms, post-mortem, anomaly, resources)
- [x] Orchestrator agent + `/incident` `/trace` `/watch` commands
- [x] Fixture validation recipes written (Cashio + Mango on Surfpool)
- [ ] Execute the Surfpool fixture runs end-to-end
- [ ] First public release / submission

## License

MIT — see [LICENSE](LICENSE).
