// monitor.ts — the runnable form of the invariant runner sketched in
// skill/invariant-monitoring.md ("From invariant to runnable monitor").
//
// It is deliberately program-agnostic: it evaluates a declarative invariants
// spec (invariants.json) against whatever RPC it is pointed at — mainnet for a
// live program, or a local Surfpool surfnet for a reconstructed breach. Each
// term resolves to a bigint from on-chain data; the expression is evaluated with
// a small safe bigint evaluator (never eval()). A failing invariant is a Breach.
//
// This is what run-invariant-surfpool.ts asserts on: it holds on a healthy
// (supply == backing) state and breaches the instant unbacked supply is minted.

import { createSolanaRpc, address } from "@solana/kit";

export type Term =
  | { kind: "tokenSupply"; mint: string }
  | { kind: "sumTokenBalances"; accounts: string[] }
  | { kind: "literal"; value: string };

export type Invariant = {
  id: string;
  family: string;
  severity: string;
  expr: string;
  terms: Record<string, Term>;
  epsilon?: string;
};

export type Breach = {
  id: string;
  family: string;
  severity: string;
  expr: string;
  observed: Record<string, string>;
  ok: boolean;
};

export function makeRpc(url = process.env.RPC_URL ?? process.env.HELIUS_RPC_URL ?? "http://127.0.0.1:8899") {
  return createSolanaRpc(url);
}

type Rpc = ReturnType<typeof makeRpc>;

async function resolve(rpc: Rpc, term: Term): Promise<bigint> {
  switch (term.kind) {
    case "literal":
      return BigInt(term.value);
    case "tokenSupply": {
      const r = await rpc.getTokenSupply(address(term.mint)).send();
      return BigInt(r.value.amount);
    }
    case "sumTokenBalances": {
      const balances = await Promise.all(
        term.accounts.map((a) => rpc.getTokenAccountBalance(address(a)).send()),
      );
      return balances.reduce((s, b) => s + BigInt(b.value.amount), 0n);
    }
  }
}

// --- tiny safe bigint evaluator -------------------------------------------------
// Grammar (enough for the shipped invariants):
//   cmp   := add ( ("<="|">="|"=="|"!="|"<"|">") add )?
//   add   := mul ( ("+"|"-") mul )*
//   mul   := unary ( ("*") unary )*
//   unary := "abs" "(" cmp ")" | primary
//   primary := number | identifier | "(" cmp ")"
// Identifiers resolve to pre-computed term values. Returns boolean for a cmp,
// or bigint for a bare arithmetic expression.
function evalExpr(expr: string, env: Record<string, bigint>): boolean {
  const toks = expr.match(/<=|>=|==|!=|[<>()+\-*]|abs|[A-Za-z_]\w*|\d+/g) ?? [];
  let i = 0;
  const peek = () => toks[i];
  const next = () => toks[i++];

  function primary(): bigint {
    const t = next();
    if (t === "(") {
      const v = cmpArith();
      if (next() !== ")") throw new Error("expected )");
      return v as bigint;
    }
    if (t === "abs") {
      if (next() !== "(") throw new Error("expected ( after abs");
      const v = cmpArith() as bigint;
      if (next() !== ")") throw new Error("expected )");
      return v < 0n ? -v : v;
    }
    if (/^\d+$/.test(t)) return BigInt(t);
    if (/^[A-Za-z_]\w*$/.test(t)) {
      if (!(t in env)) throw new Error(`unknown term '${t}'`);
      return env[t];
    }
    throw new Error(`unexpected token '${t}'`);
  }
  function mul(): bigint {
    let v = primary();
    while (peek() === "*") { next(); v = v * primary(); }
    return v;
  }
  function add(): bigint {
    let v = mul();
    while (peek() === "+" || peek() === "-") { const op = next(); const r = mul(); v = op === "+" ? v + r : v - r; }
    return v;
  }
  // returns bigint for arithmetic, boolean for a comparison
  function cmpArith(): bigint | boolean {
    const l = add();
    const op = peek();
    if (op && ["<=", ">=", "==", "!=", "<", ">"].includes(op)) {
      next();
      const r = add();
      switch (op) {
        case "<=": return l <= r;
        case ">=": return l >= r;
        case "==": return l === r;
        case "!=": return l !== r;
        case "<": return l < r;
        case ">": return l > r;
      }
    }
    return l;
  }
  const result = cmpArith();
  if (i !== toks.length) throw new Error(`trailing tokens in '${expr}'`);
  if (typeof result !== "boolean") throw new Error(`expr '${expr}' is not a comparison`);
  return result;
}

export async function check(rpc: Rpc, inv: Invariant): Promise<Breach> {
  const env: Record<string, bigint> = {};
  await Promise.all(
    Object.entries(inv.terms).map(async ([k, t]) => {
      env[k] = await resolve(rpc, t);
    }),
  );
  if (inv.epsilon != null) env.epsilon = BigInt(inv.epsilon);
  const ok = evalExpr(inv.expr, env);
  return {
    id: inv.id,
    family: inv.family,
    severity: inv.severity,
    expr: inv.expr,
    observed: Object.fromEntries(Object.entries(env).map(([k, v]) => [k, v.toString()])),
    ok,
  };
}

export async function checkAll(rpc: Rpc, invariants: Invariant[]): Promise<Breach[]> {
  return Promise.all(invariants.map((inv) => check(rpc, inv)));
}

// allow `tsx monitor.ts invariants.json` for a one-shot manual run
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import("node:fs");
  const specPath = process.argv[2] ?? "./invariants.cashio.json";
  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  const rpc = makeRpc();
  const results = await checkAll(rpc, spec.invariants);
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗ BREACH"} ${r.id} [${r.severity}] ${r.expr}  ${JSON.stringify(r.observed)}`);
  }
  if (results.some((r) => !r.ok)) process.exit(2);
}
