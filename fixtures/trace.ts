// trace.ts — the runnable form of the engine described in
// skill/fund-tracing-forensics.md. Core thesis: trace *value*, not tokens.
// A swap is a token substitution inside ONE actor, not a hop — so we net each
// actor's per-token delta in a transaction. That survives DEX routing, wraps,
// flash loans and aggregators. This file is intentionally dependency-light
// (@solana/kit only) so it runs against immutable mainnet history with no fork.

import { createSolanaRpc, address, signature, type Signature } from "@solana/kit";

const RPC_URL = process.env.HELIUS_RPC_URL ?? process.env.RPC_URL;
if (!RPC_URL) {
  throw new Error(
    "Set HELIUS_RPC_URL (or RPC_URL) to an *archive* RPC. These exploits (Cashio Mar 2022, " +
      "Mango Oct 2022) predate non-archive retention — a default endpoint will 404 the transactions.",
  );
}
export const rpc = createSolanaRpc(RPC_URL);

const NATIVE = "SOL"; // native lamport delta, keyed alongside SPL mints

type TokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { amount: string; decimals: number };
};

// key = `${owner}|${mint}` -> base-unit amount
function indexByOwnerMint(balances: TokenBalance[]): Record<string, bigint> {
  const out: Record<string, bigint> = {};
  for (const b of balances) {
    if (!b.owner) continue;
    const key = `${b.owner}|${b.mint}`;
    out[key] = (out[key] ?? 0n) + BigInt(b.uiTokenAmount.amount);
  }
  return out;
}

// index of `owner` in the message account keys (for the native SOL delta)
function accountIndex(tx: any, owner: string): number {
  const keys = tx.transaction.message.accountKeys as Array<string | { pubkey: string }>;
  return keys.findIndex((k) => (typeof k === "string" ? k : k.pubkey) === owner);
}

export type Delta = Record<string, bigint>;

// Net value an actor gained (+) or lost (-) in one tx, per token. SOL as NATIVE.
// e.g. { CASH: -28_840_000n, USDC: +28_800_000n }  -> a swap, follow the +.
export async function actorDelta(sig: string, owner: string): Promise<Delta> {
  const tx = await rpc
    .getTransaction(signature(sig) as Signature, {
      maxSupportedTransactionVersion: 0,
      encoding: "jsonParsed",
    })
    .send();
  if (!tx?.meta) throw new Error(`no meta for ${sig} (pruned? wrong/non-archive RPC?)`);
  const m: any = tx.meta;
  const delta: Delta = {};

  const pre = indexByOwnerMint(m.preTokenBalances ?? []);
  const post = indexByOwnerMint(m.postTokenBalances ?? []);
  for (const key of new Set([...Object.keys(pre), ...Object.keys(post)])) {
    const [o, mint] = key.split("|");
    if (o !== owner) continue;
    const d = (post[key] ?? 0n) - (pre[key] ?? 0n);
    if (d !== 0n) delta[mint] = (delta[mint] ?? 0n) + d;
  }

  const i = accountIndex(tx, owner);
  if (i >= 0) {
    const d = BigInt(m.postBalances[i]) - BigInt(m.preBalances[i]);
    if (d !== 0n) delta[NATIVE] = (delta[NATIVE] ?? 0n) + d;
  }
  return delta;
}

// Every owner touched in a tx with their net per-token delta. Useful for
// resolving the counterparty of an outflow (the actor with the matching +delta).
export async function allDeltas(sig: string): Promise<Record<string, Delta>> {
  const tx = await rpc
    .getTransaction(signature(sig) as Signature, {
      maxSupportedTransactionVersion: 0,
      encoding: "jsonParsed",
    })
    .send();
  if (!tx?.meta) throw new Error(`no meta for ${sig}`);
  const m: any = tx.meta;
  const pre = indexByOwnerMint(m.preTokenBalances ?? []);
  const post = indexByOwnerMint(m.postTokenBalances ?? []);
  const out: Record<string, Delta> = {};
  for (const key of new Set([...Object.keys(pre), ...Object.keys(post)])) {
    const [o, mint] = key.split("|");
    const d = (post[key] ?? 0n) - (pre[key] ?? 0n);
    if (d === 0n) continue;
    (out[o] ??= {})[mint] = (out[o][mint] ?? 0n) + d;
  }
  return out;
}

export async function getSlot(sig: string): Promise<{ slot: bigint; blockTime: number | null }> {
  const tx = await rpc
    .getTransaction(signature(sig) as Signature, {
      maxSupportedTransactionVersion: 0,
      encoding: "jsonParsed",
    })
    .send();
  const bt = (tx as any)?.blockTime;
  return { slot: BigInt(tx!.slot), blockTime: bt != null ? Number(bt) : null };
}
