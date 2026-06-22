# Runtime → Build-Time Feedback Loop

> **Crown jewel #3 — the "fit" masterstroke.** Every other run-time tool ends at the post-mortem. This one keeps going: it turns the incident's *root cause* into a build-time artifact in the native format of the kit's existing security skills — a Semgrep rule, a formal `.qedspec` invariant, a checklist rule — and PRs it upstream. The next protocol catches the same bug class at **compile, scan, and proof time**, never again at t=0. This is the skill closing the loop the kit left open.

Use this file when the operator asks any of: *"How do we stop this recurring?"*, *"Write the audit rule for this bug"*, *"How would a build-time tool have caught this?"*, or after [postmortem.md](postmortem.md) has named a root cause.

---

## The loop the kit left open

The Solana AI Kit audits a protocol five-plus ways *before* launch (build-time) and zero ways *after*. This skill is the run-time layer — but a run-time layer that only detects and traces is a fire department with no fire code. The value compounds only if each fire **rewrites the code**:

```
   build-time            (the gap)            run-time
 ┌────────────┐                          ┌──────────────────┐
 │ audit /    │   ───── ships ─────►     │ live on mainnet  │
 │ verify /   │                          │ incident happens │
 │ checklist  │ ◄──── feedback-loop ──── │ post-mortem      │
 └────────────┘   (this file)            └──────────────────┘
```

Without the feedback edge, the kit's build-time skills only ever learn from *audits*. With it, they learn from **every exploit that reaches production anywhere** — the richest possible training signal, because production exploits are the bugs that survived auditing. A post-mortem that ends in a Slack channel teaches nobody. A post-mortem that ends in a merged Semgrep rule teaches every future scan.

---

## One root cause, three artifacts: the depth ladder

A single root cause expresses itself at three levels of rigor, and the kit has a build-time skill at each. Mint the artifact at every level the root cause supports — they are complementary, not redundant.

| Layer | Catches the… | Build-time skill | Artifact format | Rigor | Runs |
|---|---|---|---|---|---|
| **Pattern** | code *shape* | [trailofbits](https://github.com/trailofbits/skills) | Semgrep rule (YAML) | heuristic, fast | every PR / CI scan |
| **Property** | *proposition* | [qedgen](https://github.com/QEDGen/solana-skills) | `.qedspec` invariant / `ensures` | exhaustive (Kani + Lean) | pre-merge verify |
| **Principle** | *design gap* | [safe-solana-builder](https://github.com/frankcastleauditor/safe-solana-builder) | checklist rule + vuln class | human review | at scaffold time |

**Pattern → property → principle.** The Semgrep rule is cheap and broad — it greps the *syntax* of the mistake and fires on every PR. The qedspec invariant is expensive and total — it *proves* the property holds across all reachable states. The checklist rule is conceptual — it stops the design before a line is written. The same lesson, three depths, three repos.

> **The unification that ties all three crown jewels together.** The qedspec invariant this file PRs is the **same proposition** the [invariant-monitoring.md](invariant-monitoring.md) runner watches live. `cash_supply <= total_backing` is one sentence stated at two points on the lifecycle: as a **run-time tripwire** (crown jewel #1, observed every slot) and as a **compile-time proof** (crown jewel #3, proven for every state). The feedback loop is the act of *promoting a tripwire into a theorem.* Detect it once at t=0; prove it can never happen again.

---

## From post-mortem to rule (the procedure)

Work from the **root cause**, never the symptom. "Funds were drained" is a symptom; "a caller-supplied account was trusted as collateral without an owner check" is a root cause. Only root causes generalize into rules.

**1. Extract the root-cause class.** From [postmortem.md](postmortem.md)'s root-cause field, name the *class*, not the instance: missing-owner-check, unvalidated-oracle, unchecked-arithmetic, missing-reinit-guard, CPI-to-arbitrary-program. Map to the families [safe-solana-builder](https://github.com/frankcastleauditor/safe-solana-builder) already enumerates so you land in an existing category.

**2. Decide which layers it supports.** Is there a *code shape* a static matcher could flag? → Semgrep. Is there a *property* that must hold over state? → qedspec. Is there a *design decision* a reviewer should always make? → checklist. Most root causes support two or three; some (a pure economic/oracle root cause) skip the Semgrep layer because there's no syntactic tell.

**3. Generalize past the specific exploit.** The rule must catch the *class*, not just the transaction that happened. Cashio's rule must fire on any unvalidated collateral account, not only on the Saber LP mint the attacker used. Write the rule, then ask: "what's the trivial variant that evades this?" and widen until variants are covered.

**4. Mint the artifact in the target's format.** Real YAML, real `.qedspec`, real checklist row — the next three sections show each for Cashio.

**5. Validate the rule reproduces the catch.** A rule that doesn't fire on the historical bug is decoration. Test it (the validation section below).

**6. PR upstream in their contribution shape.** These are *third-party* repos — you generate the artifact and open a PR, you do not edit them in place. Match their file layout, naming, and test conventions (the upstream-PR map below).

**Feedback-loop checklist (emit this filled in):**
- [ ] Root-cause *class* named (not the symptom, not the single tx)
- [ ] Layers chosen (pattern / property / principle) with a reason for any skipped
- [ ] Each artifact generalizes past the specific exploit (trivial-variant test done)
- [ ] Each artifact validated to fire on the historical bug + not on a clean fixture
- [ ] Upstream target repo, path, and PR conventions identified per artifact

---

## Minting the three artifacts (worked: Cashio)

**Cashio's root cause:** the program accepted **caller-supplied token accounts as collateral** and read their balances into its backing math without ever checking those accounts were the canonical, program-owned vaults for the expected mint. Generic class: *account substitution — a value-bearing account is trusted but its owner/address is never constrained* (the single most common Solana bug class). It supports all three layers.

### Artifact A — Semgrep rule (trailofbits): the pattern

Catches the *shape*: a token-account amount flowing into state/arithmetic with no preceding key/owner constraint.

```yaml
rules:
  - id: solana-unvalidated-collateral-account
    languages: [rust]
    severity: ERROR
    message: >
      Token-account balance read into value/backing math without a verified
      owner or address constraint. A caller can substitute an arbitrary account
      they control as "collateral." Constrain it (Anchor `has_one` / `address =`
      / `token::authority`) or `require_keys_eq!` against the canonical PDA
      before its balance is trusted. Root cause of the Cashio infinite-mint
      ($48M, Mar 2022).
    metadata:
      category: security
      cwe: ["CWE-345: Insufficient Verification of Data Authenticity"]
      confidence: MEDIUM
      references: ["https://rekt.news/cashio-rekt/"]
      source-incident: cashio-2022-03
    patterns:
      - pattern: $AMT = $ACC.amount
      - pattern-not-inside: |
          require_keys_eq!(...);
          ...
      - pattern-not-inside: |
          #[account(... has_one = $X ...)]
          ...
      - metavariable-pattern:
          metavariable: $ACC
          patterns:
            - pattern-either:
                - pattern: ctx.accounts.$F
```

Honest about its limits: Semgrep matches syntax, so it carries false positives and misses obfuscated dataflow — that's *why* the qedspec layer exists alongside it. The Semgrep rule is the cheap tripwire on every PR; the proof is the exhaustive backstop.

### Artifact B — qedspec invariant (qedgen): the property

Catches the *proposition*. This is the run-time invariant from [invariant-monitoring.md](invariant-monitoring.md), reborn as a thing the verifier proves before the program ever ships:

```fsharp
spec CashioCrate

state {
  cash_supply   : U64   // supply of the CASH stable mint
  total_backing : U64   // summed, valued collateral-vault balances
}

// Character-for-character the run-time `cash-solvency` invariant —
// observed every slot in monitor.ts, PROVEN here over every reachable state.
invariant cash_solvency :
  state.cash_supply <= state.total_backing

handler mint_cash (amount : U64) {
  // the missing Cashio check, now a precondition Kani must discharge:
  requires is_canonical_vault(collateral) else UntrustedCollateral
  requires amount > 0
  effect { cash_supply += amount }
  invariant cash_solvency        // preserves: assume pre, assert post
  ensures  state.cash_supply == old(state.cash_supply) + amount
}
```

`invariant cash_solvency` on the mint handler makes QEDGen emit a Kani BMC harness + a Lean preservation theorem: there is **no** input under which `mint_cash` can leave `cash_supply > total_backing`. The Cashio exploit is not findable by testing harder — it is *excluded by proof*. Link the invariant from the init handler with `establishes cash_solvency`.

### Artifact C — security-checklist rule (safe-solana-builder): the principle

Catches the *design gap* before code exists. Two pieces, in Frank Castle's format.

A new entry in the skill's enforced vulnerability classes (under *Vault & pool architecture*):

> - **Backing & collateral custody** — every collateral/backing account is the canonical program-owned vault for its expected mint; caller-supplied token accounts are never trusted as backing. Verify `owner == program PDA` **and** `mint == expected` before any balance enters value math. *(Cashio class.)*

A new row for the generated per-program **Security Checklist** table:

```
| #  | Category                 | Rule                                              | Status     | Notes |
|----|--------------------------|---------------------------------------------------|------------|-------|
| 32 | Vault & Pool Architecture| Collateral accounts validated as canonical vaults | ✅ Applied | each backing account checked `owner == program_pda` + `mint == expected` before its balance is summed into `total_backing` |
```

---

## Not every root cause mints every artifact

The mapping is **root-cause-class-driven**, not one-size-fits-all — the same nuance [fund-tracing-forensics.md](fund-tracing-forensics.md) applies to "not all *gone* is equal."

**Mango Markets** (Oct 2022, ~$116M) had no syntactic tell — the code was *correct*; the **economics** were exploitable, because a single thin perp market set the oracle price used for borrow limits. So:

- **Semgrep: skip.** There is no code shape to match — this is not a missing check.
- **qedspec: a bounds property.** `borrow_limit` derived from a price guarded by a cross-source deviation cap and confidence band → `invariant collateral_value_sane`. The verifier proves the limit can't be set from a manipulable single source.
- **checklist: the design rule.** "Collateral valuation must use a manipulation-resistant oracle (TWAP / multi-source median) with a per-slot deviation circuit-breaker." This is where economic root causes do their best work — upstream of the first line of code.

Rule of thumb: **missing-check** root causes hit all three; **economic/oracle** root causes are checklist + qedspec; **arithmetic/overflow** root causes are Semgrep + qedspec; **process/governance** root causes (leaked upgrade key) are checklist-only.

---

## Validate the rule before you PR it

A rule you haven't tested against the real bug is a guess. Each artifact has a cheap, deterministic validation — and the fixtures are permanent on-chain history, so no fork is required.

1. **Semgrep:** reconstruct the vulnerable Anchor account struct from the post-mortem (or the program's pre-fix source) and assert the rule fires on it; assert it does **not** fire on the patched version or a constrained clean fixture. (trailofbits' rule-creator is test-first — ship the `.rs` test pair beside the `.yaml`.)
2. **qedspec:** run `qedgen verify` on a spec that models the *pre-fix* handler (drop the `requires is_canonical_vault`) and assert the `cash_solvency` obligation **fails** with a counterexample; restore the precondition and assert it **passes**. The counterexample is the exploit, rediscovered by the prover.
3. **checklist:** confirm the new row, applied to the historical program, would have been marked ❌ — i.e., the rule actually discriminates the vulnerable design from a safe one.

If the rule can't catch a bug that is already public knowledge, it won't catch the next one. This is the same "validate against the immutable record" discipline crown jewels #1 and #2 use, pointed at build-time artifacts.

---

## Where each artifact lands (the upstream-PR map)

These are independent third-party repos. Generate the artifact, open a PR in *their* shape; never edit them in place.

| Artifact | Repo | Lands as | Their convention |
|---|---|---|---|
| Semgrep rule | [trailofbits/skills](https://github.com/trailofbits/skills) | a `.yaml` + paired test under the static-analysis rule set | rule-id kebab-case, `metadata.references`, test-first vulnerable/safe `.rs` pair |
| qedspec invariant | [QEDGen/solana-skills](https://github.com/QEDGen/solana-skills) | an `invariant` / `ensures` added to the archetype spec or an example | must `qedgen check` clean and `qedgen verify` green before PR |
| Checklist rule | [frankcastleauditor/safe-solana-builder](https://github.com/frankcastleauditor/safe-solana-builder) | a new enforced-class bullet in `SKILL.md` + a checklist-table row | match the existing category names; cite the source incident |

Tag every PR with the originating incident (`source-incident: cashio-2022-03`) so the build-time corpus stays traceable to the run-time event that taught it — the audit trail of the whole loop.

---

## Output contract

When this skill runs, deliver — not prose:

1. **Root-cause class** lifted from the post-mortem (one line, generalized).
2. **Layer decision** — which of pattern/property/principle, with a reason for any skipped.
3. **Semgrep rule** (`.yaml`) + its vulnerable/safe test pair, where the layer applies.
4. **qedspec fragment** — the `invariant` + handler linkage, cross-referenced to the run-time invariant it mirrors.
5. **Checklist artifact** — the new vuln-class bullet + the table row.
6. **Validation evidence** — proof each artifact fires on the historical bug and not on a clean fixture.
7. **Three upstream PR stubs** — target repo, path, and a one-line PR title each, tagged with the source incident.

---

## Edge cases & gotchas

- **Rule on the class, not the transaction.** A rule that only matches the exact mint/account the attacker used is worthless on the next protocol. Always run the trivial-variant test: rename the account, reorder the instructions, swap the DEX — does the rule still fire?
- **False positives are how rules die.** A Semgrep rule that flags every account access gets muted within a day. Constrain with `pattern-not-inside` for the legitimate validated forms (`has_one`, `address =`, `require_keys_eq!`) so it fires only on the genuinely unguarded shape.
- **Don't PR a noisy rule.** Validate against a *clean* fixture too, not just the vulnerable one. A rule that can't tell safe from unsafe code is net-negative for the upstream repo.
- **Some lessons aren't a code rule at all.** A leaked upgrade key or a social-engineered multisig signer has no Semgrep pattern and no qedspec invariant — it is a *process* checklist item ([preparedness.md](preparedness.md) / [pause-guardian.md](pause-guardian.md)). Forcing it into a static rule produces noise; route it to the right layer.
- **Respect upstream ownership.** You're contributing to repos you don't own. Match their style, run their validators (`qedgen check`, the semgrep test runner), and let maintainers own the merge. An artifact rejected upstream still ships inside this skill's [resources.md](resources.md) as a local rule.
- **The loop must not leak protocol secrets.** A rule derived from a still-confidential incident can encode the exploit before it's patched everywhere. Coordinate disclosure ([comms-and-coordination.md](comms-and-coordination.md)) before PRing a rule that reveals a live, unpatched bug class.

---

## Hand-offs

- Root cause comes from → [postmortem.md](postmortem.md) (the structured write-up this file consumes).
- The proven invariant is the same one watched live → [invariant-monitoring.md](invariant-monitoring.md) (promote the tripwire to a theorem; demote a theorem you can't prove back to a monitor).
- Laundering-route lessons → a *detection* rule, not a build-time one → [fund-tracing-forensics.md](fund-tracing-forensics.md) + [anomaly-detection.md](anomaly-detection.md) (e.g., "alert when protocol funds reach a known bridge within N slots of a vault drop").
- Process/governance root causes → [preparedness.md](preparedness.md) + [pause-guardian.md](pause-guardian.md), not a code rule.
- Build-time targets and their formats are catalogued in → [resources.md](resources.md).
