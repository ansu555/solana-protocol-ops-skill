// run-invariant-surfpool.ts — validation driver for crown jewel #1.
//
// Proves the shipped invariant monitor (monitor.ts) actually FIRES on the Cashio
// breach, using the recommended *synthetic reconstruction via cheatcodes* on a
// local Surfpool surfnet (skill/invariant-monitoring.md → "Validate the detector
// before you trust it"). We do NOT fork 2022 mainnet (archive-state limits make
// that brittle); we reconstruct the breach *condition* from scratch:
//
//   1. Seed a healthy state: CASH supply == collateral backing, and the program's
//      recorded collateral == its real on-chain vault. Run the monitor → GREEN.
//   2. Fire the bug: mint 2,000,000,000 unbacked CASH (the effect of Cashio's
//      missing owner check) while the real vault is untouched, and let the
//      program's accounting record the fake collateral. Run the monitor → the
//      cash-solvency (supply>backing) and collateral-custody (recorded!=vault)
//      invariants both BREACH at SEV1, in the same state — exactly the t=0 catch.
//
// Requires a local surfnet:  surfpool start --no-tui --no-deploy -y
// Run:  npm run invariant:surfpool

import { writeFileSync } from "node:fs";
import { generateKeyPairSigner, address } from "@solana/kit";
import { setSplMint, setTokenBalance, getHealth } from "./cheats.ts";
import { makeRpc, checkAll, type Invariant, type Breach } from "./monitor.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Cheatcode writes commit on the next slot (surfnet runs in clock mode), so poll
// until the seeded accounts are queryable before evaluating the monitor.
async function settle(rpc: ReturnType<typeof makeRpc>, accounts: string[], tries = 40) {
  for (let t = 0; t < tries; t++) {
    const infos = await Promise.all(accounts.map((a) => rpc.getAccountInfo(address(a)).send().catch(() => null)));
    if (infos.every((i) => i?.value)) return;
    await sleep(200);
  }
  throw new Error(`accounts never committed after ${tries} tries: ${accounts.join(", ")}`);
}

// Phase-2 overwrites an existing mint, so poll until getTokenSupply reflects the
// new value (the account already exists; only its supply field changes).
async function settleSupply(rpc: ReturnType<typeof makeRpc>, mint: string, want: bigint, tries = 40) {
  for (let t = 0; t < tries; t++) {
    const r = await rpc.getTokenSupply(address(mint)).send().catch(() => null);
    if (r && BigInt(r.value.amount) === want) return;
    await sleep(200);
  }
  throw new Error(`mint ${mint} supply never reached ${want}`);
}

const SURF_URL = process.env.SURFPOOL_URL ?? "http://127.0.0.1:8899";
const DECIMALS = 6;

// The Cashio worked-example numbers (base units), from skill/invariant-monitoring.md.
const HEALTHY = 28_840_000n;
const UNBACKED_MINT = 2_000_000_000_000_000n; // attacker mints 2,000,000,000 CASH (6 decimals)
const BREACHED_SUPPLY = HEALTHY + UNBACKED_MINT;

async function newAddr(): Promise<string> {
  return (await generateKeyPairSigner()).address as string;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

async function main() {
  // fail fast with a helpful message if the surfnet isn't up
  try {
    await getHealth();
  } catch {
    throw new Error(
      `No surfnet at ${SURF_URL}. Start one first:\n` +
        `  surfpool start --no-tui --no-deploy -y\n` +
        `(then re-run: npm run invariant:surfpool)`,
    );
  }
  const rpc = makeRpc(SURF_URL);

  // synthetic actors (fresh keypairs — purely local, never touch mainnet)
  const cashMint = await newAddr();
  const collatMint = await newAddr();
  const programPda = await newAddr(); // owns the real, program-controlled collateral vault
  const accounting = await newAddr(); // models the program's *recorded* collateral total

  // ---- phase 1: healthy baseline -----------------------------------------------
  // Both mints must exist before token accounts can reference them. The collateral
  // mint's own supply is irrelevant here (we read vault balances, not its supply).
  await setSplMint(cashMint, { supply: HEALTHY, decimals: DECIMALS });
  await setSplMint(collatMint, { supply: HEALTHY, decimals: DECIMALS });
  const realVault = await setTokenBalance(programPda, collatMint, HEALTHY);
  const recordedVault = await setTokenBalance(accounting, collatMint, HEALTHY);
  await settle(rpc, [cashMint, realVault, recordedVault]);

  const invariants: Invariant[] = [
    {
      id: "cash-solvency",
      family: "solvency",
      severity: "SEV1",
      expr: "cash_supply <= total_backing",
      terms: {
        cash_supply: { kind: "tokenSupply", mint: cashMint },
        total_backing: { kind: "sumTokenBalances", accounts: [realVault] },
      },
      epsilon: "0",
    },
    {
      id: "collateral-custody",
      family: "custody",
      severity: "SEV1",
      expr: "abs(recorded_collateral - vault_balance) <= epsilon",
      terms: {
        recorded_collateral: { kind: "sumTokenBalances", accounts: [recordedVault] },
        vault_balance: { kind: "sumTokenBalances", accounts: [realVault] },
      },
      epsilon: "1",
    },
  ];

  const baseline = await checkAll(rpc, invariants);
  logPhase("baseline (healthy: supply == backing)", baseline);
  assert(baseline.every((b) => b.ok), "all invariants must hold on the healthy baseline");

  // ---- phase 2: fire the bug ---------------------------------------------------
  // Mint unbacked CASH (the effect of the missing owner check) and let accounting
  // record the fake collateral; the real program vault is untouched.
  await setSplMint(cashMint, { supply: BREACHED_SUPPLY, decimals: DECIMALS });
  await setTokenBalance(accounting, collatMint, BREACHED_SUPPLY);
  // realVault intentionally NOT changed.
  await settleSupply(rpc, cashMint, BREACHED_SUPPLY);

  const breached = await checkAll(rpc, invariants);
  logPhase("post-exploit (2,000,000,000 unbacked CASH minted)", breached);

  const solvency = breached.find((b) => b.id === "cash-solvency")!;
  const custody = breached.find((b) => b.id === "collateral-custody")!;
  assert(!solvency.ok, "cash-solvency must BREACH once supply exceeds backing");
  assert(solvency.severity === "SEV1", "cash-solvency breach must be SEV1");
  assert(!custody.ok, "collateral-custody must BREACH (recorded != real vault)");

  const result = {
    fixture: "invariant-cashio-surfpool",
    generatedAt: new Date().toISOString(),
    method:
      "Synthetic reconstruction via Surfpool cheatcodes (surfnet_setAccount for the SPL mint supply, " +
      "surfnet_setTokenAccount for collateral balances) on a local surfnet — no historical fork.",
    proves:
      "The shipped invariant monitor (monitor.ts) holds on a healthy supply==backing state and fires " +
      "SEV1 breaches on cash-solvency and collateral-custody the instant 2,000,000,000 unbacked CASH " +
      "is minted — i.e. it would have caught Cashio at t=0, before the Saber swap or the bridge.",
    surfpool: await safeVersion(rpc),
    accounts: { cashMint, collatMint, programPda, realVault, accounting },
    phases: {
      baseline: { state: "supply == backing", breaches: baseline },
      postExploit: { state: `supply = ${BREACHED_SUPPLY} vs backing = ${HEALTHY}`, breaches: breached },
    },
  };

  const outPath = new URL("./invariant-surfpool.json", import.meta.url);
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\n✔ all assertions passed. wrote ${outPath.pathname}`);
}

function logPhase(name: string, breaches: Breach[]) {
  console.log(`\n▶ ${name}`);
  for (const b of breaches) {
    console.log(`  ${b.ok ? "✓ holds " : "✗ BREACH"} ${b.id} [${b.severity}] ${b.expr}  ${JSON.stringify(b.observed)}`);
  }
}

async function safeVersion(rpc: ReturnType<typeof makeRpc>) {
  try {
    return (await rpc.getVersion().send()) as unknown;
  } catch {
    return null;
  }
}

main().catch((e) => {
  console.error("\n✗", e.message);
  process.exit(1);
});
