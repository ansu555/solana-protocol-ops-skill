// inspect-cashio.ts — given the drain tx, find the attacker EOA (who received
// the 2B CASH) and then locate the swap leg in the attacker's own history.

import { createSolanaRpc, address, signature, type Signature } from "@solana/kit";
import { allDeltas, actorDelta } from "./trace.ts";

const rpc = createSolanaRpc(process.env.HELIUS_RPC_URL!);
const CASH = "CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT";
const DRAIN = "4fgL8D6QXKH1q3Gt9GPzeRDpTgq4cE5hxf1hNDUWrJVUe4qDJ1xmUZE7KJWDANT99jD8UvwNeBb1imvujz3Pz2K5";

const fmt = (d: Record<string, bigint>) =>
  Object.fromEntries(Object.entries(d).map(([k, v]) => [k.slice(0, 8), v.toString()]));

async function main() {
  console.log(`=== drain tx ${DRAIN.slice(0, 12)}… deltas by owner ===`);
  const deltas = await allDeltas(DRAIN);
  let attacker = "";
  for (const [owner, d] of Object.entries(deltas)) {
    const cash = d[CASH] ?? 0n;
    console.log(`  ${owner}  ${JSON.stringify(fmt(d))}`);
    if (cash > 0n && cash >= 1_000_000_000_000_000n) attacker = owner; // received >= 1B CASH
  }
  console.log(`\nattacker EOA (received the minted CASH): ${attacker}`);
  if (!attacker) { console.log("could not identify attacker"); return; }

  // attacker's own tx history — small, since it was a fresh EOA
  const sigs = await rpc.getSignaturesForAddress(address(attacker), { limit: 1000 }).send();
  console.log(`\nattacker has ${sigs.length} signatures. Scanning for the swap leg (CASH out, stablecoin in)...`);
  const swaps: Array<{ sig: string; slot: bigint; delta: Record<string, bigint> }> = [];
  for (const s of sigs) {
    const d = await actorDelta(s.signature, attacker).catch(() => ({}) as Record<string, bigint>);
    const vals = Object.values(d);
    const cashOut = (d[CASH] ?? 0n) < 0n;
    const gained = vals.some((v) => v > 0n);
    if (cashOut && gained) {
      swaps.push({ sig: s.signature, slot: BigInt(s.slot), delta: d });
      console.log(`  SWAP ${s.signature.slice(0, 16)}…  ${JSON.stringify(fmt(d))}`);
    }
  }
  console.log(`\nfound ${swaps.length} swap-leg candidate(s).`);
  if (swaps[0]) console.log(`first swap full sig: ${swaps[0].sig}`);
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
