// find-mango-funding.ts — discovery helper for the Mango backward-attribution
// fixture. Mirrors find-cashio-drain.ts: it surfaces the real coordinates to
// fill mango.seeds.json, run against an archive RPC.
//
// Given an attacker/account argument (or seeds.attacker), it prints the first
// funding inflow and the next few backward hops, so you can identify the funding
// CEX and record it as a `terminal`.
//
//   HELIUS_RPC_URL=... node --import tsx find-mango-funding.ts <ACCOUNT>
//
// If you don't yet know the attacker account, start from the Mango v3 program's
// large-withdrawal transactions in the exploit window (parseTransaction in the
// Helius MCP is the fastest way to eyeball those) and feed the recipient here.

import { readFileSync } from "node:fs";
import { firstInflow } from "./backward.ts";

const seeds = JSON.parse(readFileSync(new URL("./mango.seeds.json", import.meta.url), "utf8"));
const start = process.argv[2] ?? seeds.attacker;
if (!start || start.startsWith("<")) {
  throw new Error(
    "Pass an account: node --import tsx find-mango-funding.ts <ACCOUNT> " +
      "(or fill mango.seeds.json `attacker` first).",
  );
}

async function main() {
  console.log(`=== backward funding discovery from ${start} ===`);
  let cursor = start;
  for (let hop = 0; hop < (seeds.maxHops ?? 6); hop++) {
    const inflow = await firstInflow(cursor);
    if (!inflow) {
      console.log(`  hop ${hop}: ${cursor} — no inflow found (origin / unfunded?). Stop.`);
      break;
    }
    console.log(
      `  hop ${hop}: ${cursor}\n` +
        `     first funded by: ${inflow.funder ?? "?"}\n` +
        `     tx: ${inflow.tx}  (${inflow.blockTime})  received ${JSON.stringify(inflow.received)}`,
    );
    if (!inflow.funder) {
      console.log("     funder unresolved — inspect this tx manually (parseTransaction).");
      break;
    }
    cursor = inflow.funder;
  }
  console.log(
    `\nRecord the funding entity you recognize (a CEX hot wallet / withdrawal address) in ` +
      `mango.seeds.json "terminals", set "attacker", then: npm run trace:mango`,
  );
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
