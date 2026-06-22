// run-cashio.ts — the validation driver.
//
// Proves the engine in skill/fund-tracing-forensics.md against IMMUTABLE
// mainnet history (no fork): for each seed transaction, compute the attacker's
// net per-token delta and show that the Saber swap is a *substitution*
// ({ CASH: -big, USDC/UST: +big } for the same actor), not a hop — the central
// "trace value, not tokens" claim. Output is written to fixtures/out/cashio-trace.json.
//
// Run:  HELIUS_RPC_URL=<archive rpc> npm run trace:cashio

import { readFileSync, writeFileSync } from "node:fs";
import { actorDelta, allDeltas, getSlot } from "./trace.ts";

const seeds = JSON.parse(readFileSync(new URL("./cashio.seeds.json", import.meta.url), "utf8"));
const attacker: string = seeds.attacker;
if (!attacker || attacker.startsWith("<")) {
  throw new Error("Fill cashio.seeds.json (attacker + signatures) before running. See its `note`.");
}
const labels: Record<string, string> = seeds.labels ?? {};
const label = (a: string) => labels[a] ?? a;

type Row = {
  kind: string;
  tx: string;
  slot: string;
  blockTime: string | null;
  attackerDelta: Record<string, string>;
  substitution: boolean;
  counterparties: Record<string, Record<string, string>>;
};

function bigintMapToStr(d: Record<string, bigint>): Record<string, string> {
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [label(k), v.toString()]));
}

// A substitution = same actor has both a negative and a positive token delta in
// one tx (lost one token, gained another) — the swap signature.
function isSubstitution(d: Record<string, bigint>): boolean {
  const vals = Object.values(d);
  return vals.some((v) => v < 0n) && vals.some((v) => v > 0n);
}

async function processSig(kind: string, sig: string): Promise<Row> {
  const [delta, all, meta] = await Promise.all([actorDelta(sig, attacker), allDeltas(sig), getSlot(sig)]);
  const counterparties: Record<string, Record<string, string>> = {};
  for (const [owner, d] of Object.entries(all)) {
    if (owner === attacker) continue;
    counterparties[label(owner)] = bigintMapToStr(d);
  }
  return {
    kind,
    tx: sig,
    slot: meta.slot.toString(),
    blockTime: meta.blockTime ? new Date(meta.blockTime * 1000).toISOString() : null,
    attackerDelta: bigintMapToStr(delta),
    substitution: isSubstitution(delta),
    counterparties,
  };
}

async function main() {
  const rows: Row[] = [];
  for (const kind of ["drain", "swap"] as const) {
    for (const sig of seeds.signatures[kind] ?? []) {
      if (sig.startsWith("<")) continue;
      console.log(`\n▶ ${kind}: ${sig}`);
      const row = await processSig(kind, sig);
      console.log(`  attacker net delta: ${JSON.stringify(row.attackerDelta)}`);
      console.log(`  substitution (swap signature): ${row.substitution}`);
      rows.push(row);
    }
  }

  if (!rows.length) throw new Error("No real signatures in cashio.seeds.json — nothing to trace.");

  const result = {
    fixture: "cashio",
    generatedAt: new Date().toISOString(),
    attacker: label(attacker),
    proves:
      "Net actor-delta on real on-chain txs: the Saber leg returns { CASH: negative, stablecoin: positive } " +
      "for one actor — a substitution, not a hop. Validates the 'trace value, not tokens' engine against immutable history.",
    rows,
  };

  // committed proof artifact lives in the fixtures root (out/ is gitignored)
  const outPath = new URL("./cashio-trace.json", import.meta.url);
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\n✔ wrote ${outPath.pathname}`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
