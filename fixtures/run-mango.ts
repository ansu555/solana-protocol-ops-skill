// run-mango.ts — the backward-attribution validation driver.
//
// Proves the engine in skill/fund-tracing-forensics.md (step 6) against IMMUTABLE
// mainnet history (no fork): start at the Mango attacker account and walk inflows
// *backward* until the funding chain reaches a labeled entity (a KYC'd CEX
// withdrawal). This is the trace that recovers a *name*, not funds — the Mango
// contrast to the Cashio forward/substitution fixture.
//
// Run:  HELIUS_RPC_URL=<archive rpc> npm run trace:mango

import { readFileSync, writeFileSync } from "node:fs";
import { backwardTrace, type Inflow } from "./backward.ts";

const seeds = JSON.parse(readFileSync(new URL("./mango.seeds.json", import.meta.url), "utf8"));
const attacker: string = seeds.attacker;
if (!attacker || attacker.startsWith("<")) {
  throw new Error(
    "Fill mango.seeds.json `attacker` (and ideally `terminals`) before running. " +
      "Discover them with `HELIUS_RPC_URL=... node --import tsx find-mango-funding.ts <attacker?>`. See its `note`.",
  );
}
const labels: Record<string, string> = seeds.labels ?? {};
const terminals: Record<string, string> = seeds.terminals ?? {};
const label = (a: string) => labels[a] ?? terminals[a] ?? a;
const isTerminal = (a: string) => a in terminals && !a.startsWith("<");

async function main() {
  console.log(`▶ backward-tracing funding for attacker ${attacker}`);
  const { chain, reached, terminal } = await backwardTrace(attacker, isTerminal, seeds.maxHops ?? 6);

  for (const [i, hop] of chain.entries()) {
    console.log(
      `  hop ${i}: ${label(hop.to)} ← funded by ${hop.funder ? label(hop.funder) : "?"} ` +
        `in ${hop.tx.slice(0, 12)}… (${hop.blockTime})  received ${JSON.stringify(hop.received)}`,
    );
  }
  console.log(
    terminal
      ? `\n✔ backward trace REACHED a labeled funding entity: ${label(reached!)} — attribution target.`
      : `\n⚠ backward trace stopped at ${reached ? label(reached) : "an unresolved inflow"} ` +
          `after ${chain.length} hop(s) without hitting a labeled terminal. ` +
          `Add it to mango.seeds.json "terminals" if reporting confirms it as a CEX/funding source.`,
  );

  const labelChain = (c: Inflow[]) =>
    c.map((h) => ({ ...h, to: label(h.to), funder: h.funder ? label(h.funder) : null }));

  const result = {
    fixture: "mango",
    generatedAt: new Date().toISOString(),
    attacker: label(attacker),
    proves:
      "Backward funding-source attribution on real on-chain history: starting from the Mango attacker " +
      "account and following inflows backward reaches a labeled funding entity (a KYC'd CEX withdrawal) " +
      "in a small number of hops — the 'trace recovers a name' claim, and the Mango contrast to the " +
      "Cashio forward/substitution fixture (which traces value, not attribution).",
    reachedLabeledTerminal: terminal,
    fundingTerminal: terminal ? label(reached!) : null,
    hops: chain.length,
    chain: labelChain(chain),
  };

  const outPath = new URL("./mango-trace.json", import.meta.url);
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\n✔ wrote ${outPath.pathname}`);
  if (!terminal) {
    console.log(
      "  (artifact written, but reachedLabeledTerminal=false — fill `terminals` and re-run for the full attribution proof.)",
    );
  }
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
