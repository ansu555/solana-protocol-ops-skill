// find-cashio-drain.ts — discovery helper. Walks the CASH mint's signature
// history (oldest-first) and surfaces the transactions where CASH supply jumps,
// i.e. the malicious mintTo(s). Prints candidates so we can fill cashio.seeds.json.

import { createSolanaRpc, address, signature, type Signature } from "@solana/kit";
import { appendFileSync, writeFileSync, mkdirSync } from "node:fs";

const RPC_URL = process.env.HELIUS_RPC_URL!;
const rpc = createSolanaRpc(RPC_URL);
const CASH = "CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT";
const HITS = new URL("./out/discovery.log", import.meta.url);

async function allSignaturesOldestFirst(addr: string): Promise<Array<{ signature: string; slot: bigint; blockTime: number | null }>> {
  const all: Array<{ signature: string; slot: bigint; blockTime: number | null }> = [];
  let before: string | undefined;
  for (let page = 0; page < 50; page++) {
    const opts: any = { limit: 1000 };
    if (before) opts.before = signature(before) as Signature;
    const sigs = await rpc.getSignaturesForAddress(address(addr), opts).send();
    if (!sigs.length) break;
    for (const s of sigs) all.push({ signature: s.signature, slot: BigInt(s.slot), blockTime: s.blockTime ? Number(s.blockTime) : null });
    before = sigs[sigs.length - 1].signature;
    if (sigs.length < 1000) break;
  }
  return all.reverse(); // oldest first
}

async function cashSupplyDelta(sig: string): Promise<bigint> {
  const tx = await rpc.getTransaction(signature(sig) as Signature, { maxSupportedTransactionVersion: 0, encoding: "jsonParsed" }).send();
  const m: any = tx?.meta;
  if (!m) return 0n;
  const sum = (arr: any[]): bigint =>
    arr.filter((b) => b.mint === CASH).reduce((a: bigint, b: any) => a + BigInt(b.uiTokenAmount.amount), 0n);
  return sum(m.postTokenBalances ?? []) - sum(m.preTokenBalances ?? []);
}

async function main() {
  mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
  writeFileSync(HITS, `start ${new Date().toISOString()}\n`);
  const sigs = await allSignaturesOldestFirst(CASH);
  appendFileSync(HITS, `total=${sigs.length}\n`);
  console.log(`total CASH-mint signatures: ${sigs.length}`);
  if (sigs.length) {
    const t0 = sigs[0].blockTime, tN = sigs[sigs.length - 1].blockTime;
    console.log(`oldest: ${t0 ? new Date(t0 * 1000).toISOString() : "?"}  newest: ${tN ? new Date(tN * 1000).toISOString() : "?"}`);
  }
  // target the exploit window: 2022-03-20 .. 2022-03-27
  const lo = Date.parse("2022-03-20T00:00:00Z") / 1000;
  const hi = Date.parse("2022-03-27T00:00:00Z") / 1000;
  const window = sigs.filter((s) => s.blockTime && s.blockTime >= lo && s.blockTime <= hi);
  appendFileSync(HITS, `window=${window.length}\n`);
  console.log(`\nCASH-mint txs in 2022-03-20..27 window: ${window.length}`);

  // concurrency pool — scan all window txs in parallel, flush each big-mint hit to file
  const CONC = 16;
  let next = 0, done = 0;
  const hits: Array<{ sig: string; slot: bigint; t: string; cash: bigint }> = [];
  async function worker() {
    while (next < window.length) {
      const s = window[next++];
      const d = await cashSupplyDelta(s.signature).catch(() => 0n);
      done++;
      if (d > 1_000_000_000_000n) {
        const t = s.blockTime ? new Date(s.blockTime * 1000).toISOString() : "?";
        const line = `+${(Number(d) / 1e6).toLocaleString()} CASH  slot=${s.slot}  ${t}  ${s.signature}`;
        appendFileSync(HITS, line + "\n");
        console.log("  " + line);
        hits.push({ sig: s.signature, slot: s.slot, t, cash: d });
      }
      if (done % 200 === 0) appendFileSync(HITS, `progress ${done}/${window.length}\n`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  hits.sort((a, b) => Number(b.cash - a.cash));
  appendFileSync(HITS, `DONE hits=${hits.length}\n`);
  console.log(`\nDONE — ${hits.length} big-mint txs. Largest:`);
  for (const h of hits.slice(0, 5)) console.log(`  +${(Number(h.cash) / 1e6).toLocaleString()} CASH  ${h.sig}`);
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
