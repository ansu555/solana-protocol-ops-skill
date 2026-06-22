// backward.ts — the runnable form of the *backward attribution* engine in
// skill/fund-tracing-forensics.md (step 6, "backward-trace the funding source").
//
// Forward tracing (trace.ts) recovers funds; backward tracing recovers *names*.
// The gas / first deposit that bootstrapped an attacker EOA almost always traces
// back, in a few hops, to a KYC'd CEX withdrawal — that is how the Mango attacker
// was identified. This module starts at an account and walks *inflows* backward
// until it reaches a labeled entity (or runs out of hops).
//
// Reuses the same net-delta primitives as the forward engine, and like it, runs
// against immutable mainnet history with no fork (Mango funds stayed on Solana).

import { address, signature, type Signature } from "@solana/kit";
import { actorDelta, allDeltas, rpc } from "./trace.ts"; // reuse the archive-RPC guard + instance

const NATIVE = "SOL";

// Oldest-first signature history for an address (paginated). The *first* page of
// history of a funded EOA contains its funding transaction.
async function signaturesOldestFirst(
  addr: string,
  maxPages = 20,
): Promise<Array<{ signature: string; slot: bigint; blockTime: number | null }>> {
  const all: Array<{ signature: string; slot: bigint; blockTime: number | null }> = [];
  let before: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const opts: any = { limit: 1000 };
    if (before) opts.before = signature(before) as Signature;
    const sigs = await rpc.getSignaturesForAddress(address(addr), opts).send();
    if (!sigs.length) break;
    for (const s of sigs)
      all.push({ signature: s.signature, slot: BigInt(s.slot), blockTime: s.blockTime ? Number(s.blockTime) : null });
    before = sigs[sigs.length - 1].signature;
    if (sigs.length < 1000) break;
  }
  return all.reverse(); // oldest first
}

export type Inflow = {
  to: string;
  tx: string;
  slot: string;
  blockTime: string | null;
  // net value `to` received in this tx, per token
  received: Record<string, string>;
  // the counterparty that paid it out (matching negative delta), if resolvable
  funder: string | null;
  funderPaid: Record<string, string> | null;
};

const fmt = (d: Record<string, bigint>) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.toString()]));

// The first transaction in which `addr` received value, plus the counterparty
// that funded it (the actor with the matching outflow in the same tx).
export async function firstInflow(addr: string): Promise<Inflow | null> {
  const hist = await signaturesOldestFirst(addr);
  for (const s of hist) {
    const d = await actorDelta(s.signature, addr).catch(() => ({} as Record<string, bigint>));
    // a funding inflow = a positive delta (received SOL or a token)
    const gained = Object.entries(d).filter(([, v]) => v > 0n);
    if (!gained.length) continue;

    // resolve the payer: the other actor in this tx with a matching negative delta
    const all = await allDeltas(s.signature).catch(() => ({} as Record<string, Record<string, bigint>>));
    let funder: string | null = null;
    let funderPaid: Record<string, bigint> | null = null;
    for (const [owner, od] of Object.entries(all)) {
      if (owner === addr) continue;
      const paysWhatWeGot = gained.some(([mint]) => (od[mint] ?? 0n) < 0n) || (od[NATIVE] ?? 0n) < 0n;
      if (paysWhatWeGot) {
        funder = owner;
        funderPaid = od;
        break;
      }
    }
    return {
      to: addr,
      tx: s.signature,
      slot: s.slot.toString(),
      blockTime: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
      received: fmt(Object.fromEntries(gained)),
      funder,
      funderPaid: funderPaid ? fmt(funderPaid) : null,
    };
  }
  return null;
}

// Walk funding backward up to `maxHops` times, stopping when the funder is a
// labeled terminal (a CEX / bridge / known entity in `isTerminal`) or unresolved.
export async function backwardTrace(
  start: string,
  isTerminal: (addr: string) => boolean,
  maxHops = 6,
): Promise<{ chain: Inflow[]; reached: string | null; terminal: boolean }> {
  const chain: Inflow[] = [];
  let cursor = start;
  for (let hop = 0; hop < maxHops; hop++) {
    const inflow = await firstInflow(cursor);
    if (!inflow || !inflow.funder) {
      return { chain, reached: inflow?.funder ?? null, terminal: false };
    }
    chain.push(inflow);
    if (isTerminal(inflow.funder)) {
      return { chain, reached: inflow.funder, terminal: true };
    }
    cursor = inflow.funder;
  }
  return { chain, reached: cursor, terminal: false };
}
