# Invariant Monitoring

> **Crown jewel #1.** The highest-signal run-time detector you can ship, and almost nobody packages it. Derive a protocol's on-chain invariants from its program, watch them every slot, and alert the instant one breaks. This is the detector that would have caught **Cashio at t=0** — the moment fake collateral minted unbacked CASH, `supply > backing` became true and stayed true.

Use this file when the operator asks any of: *"What should I monitor?"*, *"Set up alerts before something breaks"*, *"How would I have caught \<exploit\>?"*, or *"Is this number supposed to be possible?"*

---

## Why invariants beat statistical anomaly detection

Statistical detection ([anomaly-detection.md](anomaly-detection.md)) asks *"is this volume/price/flow unusual versus baseline?"* — fuzzy, tunable, and full of false positives. It is a useful **second layer**, not the primary one.

An **invariant** is a property the protocol's own math guarantees must be true on every slot. If it is ever false, something is wrong **by definition** — no baseline, no threshold tuning, no false positives. A breach is not "suspicious," it is **proof of an incident already in progress**.

| | Invariant check | Statistical anomaly |
|---|---|---|
| Question | "Is a guaranteed-true property false?" | "Is this unusual vs history?" |
| False positives | ~0 (a breach is real) | Many (needs tuning) |
| Detects novel attacks | Yes — catches the *effect*, not the signature | Only if it looks unusual |
| Latency to detect | t=0 (same slot the property breaks) | After it diverges from baseline |
| Best for | Conservation / solvency / bounds | Volume spikes, new-counterparty flows |

Run both. Invariants are the tripwire; anomaly detection is the early warning.

---

## The invariant taxonomy

Every protocol invariant falls into one of five families. When deriving for a specific program, walk these five and ask "what is my version of this?"

| Family | The guarantee | Generic form | Breach means |
|---|---|---|---|
| **Conservation** | Tokens are neither created nor destroyed outside mint/burn paths | `sum(all_balances) == authorized_supply` | Unbacked mint / phantom funds |
| **Solvency / backing** | Liabilities never exceed assets | `total_issued <= total_backing_value` | Insolvency, bad debt, infinite mint |
| **Custody** | Recorded balances match real token-account balances | `accounting_total == on_chain_vault_balance` | Drain, mis-accounting, stuck funds |
| **Bounds** | Risk parameters stay inside configured limits | `value within [min, max]` (LTV, fees, util) | Parameter attack, mis-config, cascade |
| **Authority / config** | Privileged settings only change through governance | `authority == expected && config == last_known` | Key compromise, malicious upgrade |

> The first three are **hard equalities/inequalities** — a breach is SEV1, page immediately. The last two include **soft bounds** that drift legitimately — calibrate thresholds and treat as SEV2/3 unless the jump is discontinuous.

---

## Deriving invariants from a program

You cannot watch what you have not specified. Derivation is a procedure, not guesswork.

**1. Inventory the value-bearing accounts.** From the IDL / account structs and the program's known PDAs, list every: mint it controls, vault/reserve token account, and accounting field (`total_deposits`, `total_borrows`, `total_shares`, `index`, `last_price`). The Helius DAS API + `getProgramAccounts` enumerate live accounts; the IDL gives you the layout.

**2. Find the conserved quantities.** For each mint and each vault, ask "what must this always equal?" A vault token account must equal the accounting field that claims to track it. A receipt/share/LP mint's supply must correspond to assets deposited.

**3. Read the program's math for its own assumptions.** Every `require!`/`assert` and every arithmetic relationship the program *depends on* is an invariant it assumes but does not continuously verify post-hoc. `health_factor >= 1`, `reserves_a * reserves_b >= k`, `price within confidence` — these are invariants hiding in the validation logic.

**4. Map each invariant to observable on-chain data.** An invariant is only monitorable if every term is readable without privileged access: a token supply (`getTokenSupply`), a token-account balance (`getTokenAccountBalance`), a decoded account field (`getAccountInfo` + IDL codec), or an oracle account. If a term is not directly observable, derive a proxy or downgrade it to anomaly detection.

**5. Classify severity and tolerance.** Hard equality (conservation/solvency/custody) → exact, SEV1 on any breach. Soft bound (LTV drift, fee, utilization) → threshold + hysteresis, SEV2/3. Account for rounding: use an explicit epsilon for equalities that involve integer division.

**Derivation checklist (emit this filled in):**
- [ ] Every controlled mint listed, with its "what backs it" relationship
- [ ] Every vault/reserve mapped to the accounting field that must match it
- [ ] Every risk parameter with its configured `[min, max]`
- [ ] Every authority/upgrade field with its expected value snapshotted
- [ ] Each invariant marked hard/soft + epsilon + severity
- [ ] Each term confirmed readable from on-chain data (tool named)

---

## Invariant catalog by protocol archetype

Concrete starting sets. Adapt the account references to the specific program.

**AMM / DEX (constant-product or stable):**
- `vault_a.balance == pool.reserve_a` and `vault_b.balance == pool.reserve_b` *(custody)*
- `reserve_a * reserve_b >= k_last` — k only grows, via fees; a drop is a drained-pool signature *(solvency)*
- `lp_mint.supply` moves only on deposit/withdraw, monotonic with reserves *(conservation)*

**Lending:**
- `total_deposits == sum(reserve_vault_balances)` *(custody)*
- `total_borrows <= total_deposits` and per-market `utilization <= 1.0` *(solvency)*
- no account with `health_factor < 1` that is older than one slot and not being liquidated *(bounds)*
- `borrow_index` and `supply_index` are monotonically non-decreasing *(bounds)*

**Stablecoin / synthetic (the Cashio family):**
- `stable_mint.supply <= total_collateral_value` *(solvency — the Cashio invariant)*
- `total_collateral_value == sum(collateral_vault_balances * price)` *(custody)*
- every collateral vault is owned by the program PDA, not an attacker-supplied account *(authority)*

**Vault / yield aggregator:**
- `total_shares * share_price ≈ total_assets` (within rounding epsilon) *(conservation)*
- `vault_token_account.balance >= recorded_total_assets` *(custody)*
- `share_price` is monotonically non-decreasing except on a fee/loss event the program emits *(bounds)*

**Oracle-dependent (all of the above that price):**
- `|price - confidence_band| ` within tolerance; reject if `confidence/price > x%` *(bounds)*
- `|price_source_A - price_source_B| / price < deviation_max` (cross-check Pyth vs Switchboard) *(bounds)*
- `|price_t - price_{t-1}|` per slot below a circuit-breaker move — Mango's manipulation lived here *(bounds)*

---

## From invariant to runnable monitor

The skill emits two artifacts: a **declarative spec** (so invariants are reviewable and versioned) and a **generic runner** that evaluates the spec against live chain state. Don't hand-roll per-invariant scripts.

### The invariant spec (`invariants.json`)

```json
{
  "program": "CASHVDm2wsJXfhj6VWxb5GiMdgZyc9TaqQzjP7wdGABV",
  "cluster": "mainnet-beta",
  "invariants": [
    {
      "id": "cash-solvency",
      "family": "solvency",
      "severity": "SEV1",
      "expr": "cash_supply <= total_backing",
      "terms": {
        "cash_supply":   { "kind": "tokenSupply", "mint": "CASHaJsZ...<CASH mint>" },
        "total_backing": { "kind": "sumTokenBalances",
                           "accounts": ["<collateral vault 1>", "<collateral vault 2>"] }
      },
      "epsilon": "0"
    },
    {
      "id": "collateral-custody",
      "family": "custody",
      "severity": "SEV1",
      "expr": "abs(recorded_collateral - vault_balance) <= epsilon",
      "terms": {
        "recorded_collateral": { "kind": "accountField",
                                 "account": "<crate state PDA>", "field": "total_collateral" },
        "vault_balance":       { "kind": "sumTokenBalances", "accounts": ["<collateral vault 1>"] }
      },
      "epsilon": "1"
    }
  ]
}
```

### The runner (`monitor.ts`, `@solana/kit`)

```ts
import { createSolanaRpc, address } from "@solana/kit";

const rpc = createSolanaRpc(process.env.HELIUS_RPC_URL!); // kit's Helius RPC

type Term =
  | { kind: "tokenSupply"; mint: string }
  | { kind: "sumTokenBalances"; accounts: string[] }
  | { kind: "accountField"; account: string; field: string };

async function resolve(term: Term): Promise<bigint> {
  switch (term.kind) {
    case "tokenSupply": {
      const r = await rpc.getTokenSupply(address(term.mint)).send();
      return BigInt(r.value.amount);
    }
    case "sumTokenBalances": {
      const balances = await Promise.all(
        term.accounts.map(a => rpc.getTokenAccountBalance(address(a)).send())
      );
      return balances.reduce((s, b) => s + BigInt(b.value.amount), 0n);
    }
    case "accountField": {
      const info = await rpc.getAccountInfo(address(term.account), { encoding: "base64" }).send();
      return decodeField(info.value!.data, term.field); // IDL-driven codec, program-specific
    }
  }
}

async function check(inv: Invariant): Promise<Breach | null> {
  const v = Object.fromEntries(
    await Promise.all(Object.entries(inv.terms).map(async ([k, t]) => [k, await resolve(t)]))
  );
  const ok = evalExpr(inv.expr, v, BigInt(inv.epsilon)); // safe comparator, not eval()
  return ok ? null : { id: inv.id, severity: inv.severity, observed: v, slot: await slot() };
}
```

Poll every slot (or on the webhook below). On a breach: do **not** auto-pause — surface it, route to [incident-runbook.md](incident-runbook.md) for the decision tree and [pause-guardian.md](pause-guardian.md) for containment. A monitor that pauses on its own becomes its own denial-of-service.

### Push, don't poll: the Helius webhook

Polling has slot-latency and burns RPC. For t=0 detection, register a Helius webhook on the value-bearing accounts so every mutating transaction re-triggers the check:

```json
{
  "webhookType": "enhanced",
  "transactionTypes": ["ANY"],
  "accountAddresses": ["<CASH mint>", "<collateral vault 1>", "<collateral vault 2>", "<crate state PDA>"],
  "webhookURL": "https://your-ops.example.com/invariants",
  "authHeader": "<shared secret>"
}
```

The handler re-resolves the affected invariants on each event and pages on breach. This is the difference between catching Cashio in the same block versus on the next poll.

---

## Worked example: catching Cashio at t=0

Cashio (Mar 2022, ~$48M) minted CASH against **attacker-supplied fake collateral accounts** the program failed to validate as owned by its own PDA. The build-time bug was a missing owner/account check. The run-time effect was unmissable:

```
slot N-1   cash_supply = 28,840,000     total_backing = 28,840,000     ✓  supply <= backing
slot N     cash_supply = 2,000,028,840,000   total_backing = 28,840,000  ✗  BREACH (SEV1)
```

The instant the fake mint landed, `cash-solvency` flipped false and stayed false. A single equality, evaluated on the mint + vault accounts, fires before the attacker reaches the Saber swap — let alone the bridge to Ethereum and FTX. No baseline, no ML, no tuning: the protocol's own solvency promise was broken and the monitor said so in the same block.

The `collateral-custody` invariant catches the same event from a second angle — the attacker's fake vaults are not the program-owned vaults the accounting expects, so `recorded_collateral != vault_balance` also breaks.

---

## Validate the detector before you trust it

A monitor you have not tested against a real breach is a guess. Validate it on a local **Surfpool** surfnet ([resources.md](resources.md) has the MCP tool map). Prefer **synthetic reconstruction via cheatcodes** over a literal historical fork — forking 2022 mainnet is brittle (archive-state limits), and you only need to reproduce the breach *condition*, not the exact account set:

1. Seed a **healthy baseline** with cheatcodes — `surfnet_setAccount` to write the SPL mint with `supply == backing`, `surfnet_setTokenAccount` for the collateral vault. Run the monitor → assert all invariants hold (green).
2. **Fire the bug** — mint the unbacked supply (the *effect* of the missing owner check) while the real vault is untouched.
3. Re-run → assert `cash-solvency` (and `collateral-custody`) report SEV1 breaches in that state — the t=0 catch, before the Saber swap or the bridge.
4. Optionally seed a fixed state and assert the breach no longer occurs.

> [!tip] Run it
> This is shipped and passing: [`fixtures/run-invariant-surfpool.ts`](../fixtures/run-invariant-surfpool.ts) drives exactly these steps against [`monitor.ts`](../fixtures/monitor.ts) and writes the proof artifact `fixtures/invariant-surfpool.json`.
> ```bash
> surfpool start --no-tui --no-deploy -y     # local surfnet
> cd fixtures && npm install && npm run invariant:surfpool
> ```

For the **forensics** side (funds already moved), validation needs no fork at all — the txs are immutable on-chain. Mango's oracle-manipulation case is exercised by the **backward-attribution** fixture ([`fixtures/run-mango.ts`](../fixtures/run-mango.ts)); see [fund-tracing-forensics.md](fund-tracing-forensics.md).

---

## Helius MCP tool map (the data engine)

| Need | Helius MCP / RPC |
|---|---|
| Mint supply term | `getTokenSupply(mint)` |
| Vault / reserve balance term | `getTokenAccountBalance(account)` |
| Decoded accounting field | `getAccountInfo(account)` + IDL codec |
| Enumerate program accounts to derive invariants | `getProgramAccounts(programId)` / DAS |
| Live, push-based re-check | `createWebhook` (enhanced) on value-bearing accounts |
| Human-readable view of a breaching tx | `parseTransaction(signature)` → hands to [fund-tracing-forensics.md](fund-tracing-forensics.md) |

---

## Output contract

When this skill runs, deliver — not prose:

1. **Filled derivation checklist** for the specific program.
2. **`invariants.json`** — the declarative spec, reviewable in a PR.
3. **`monitor.ts`** (or Python) — the generic runner wired to the kit's Helius RPC.
4. **`webhook.json`** — the Helius enhanced-webhook config for push detection.
5. **A breach runbook line** per invariant — "if `cash-solvency` breaks → SEV1 → [incident-runbook.md](incident-runbook.md) + [pause-guardian.md](pause-guardian.md)."
6. **A Surfpool validation script** proving the monitor fires on the relevant fixture.

---

## Edge cases & gotchas

- **Rounding from integer division.** Share-price and index math rounds; use an explicit `epsilon`, never a bare `==`, for anything involving division. An epsilon that is too loose hides small drains — size it to one unit of the smallest denomination.
- **Legitimate discontinuities.** Fee accrual, governance parameter changes, and emitted loss events move accounting on purpose. Subscribe to the program's events so a real config change is not paged as a breach — and so a config change you did *not* authorize *is* (that is the authority invariant).
- **Multi-account atomicity.** Resolve all terms of one invariant at the **same slot** (`getMultipleAccounts`), not across separate calls, or a mid-flight transaction makes a true invariant look false.
- **Oracle staleness ≠ oracle attack.** A stale feed is a [dependency-class](incident-taxonomy.md) event, not a solvency breach — check publish-time before trusting a price term.
- **Decimals.** Normalize every term to a common base before comparing supply against balances; mismatched mint decimals are the most common false breach.
- **The monitor must not become the attack surface.** Read-only keys, no privileged authority in the monitor, rate-limit the webhook handler, and never let the detector hold pause authority — recommend the pause, let a human/multisig pull it.

---

## Hand-offs

- Breach detected → [incident-runbook.md](incident-runbook.md) (decision tree) + [incident-taxonomy.md](incident-taxonomy.md) (classify) + [pause-guardian.md](pause-guardian.md) (contain).
- Need the fuzzy second layer → [anomaly-detection.md](anomaly-detection.md).
- Funds already moved → [fund-tracing-forensics.md](fund-tracing-forensics.md).
- After the incident → [feedback-loop.md](feedback-loop.md) mints the missing build-time check (e.g. Cashio's owner check) back into `safe-solana-builder` / `trailofbits` / `qedgen` so the next protocol catches it at compile, not at t=0.
