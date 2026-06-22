// cheats.ts — a thin client for Surfpool's cheatcode RPC (surfnet_* methods).
// Used by run-invariant-surfpool.ts to seed a synthetic pre-exploit state and
// then "fire the bug" (mint unbacked supply) without needing the real program
// or a historical fork — the recommended reconstruction in
// skill/invariant-monitoring.md ("Validate the detector before you trust it").

import { getMintEncoder, findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { address, type Address } from "@solana/kit";

const SURF_URL = process.env.SURFPOOL_URL ?? "http://127.0.0.1:8899";
const TOKEN_PROGRAM = TOKEN_PROGRAM_ADDRESS as string; // TokenkegQ...

let id = 0;
async function rpc<T = any>(method: string, params: any[]): Promise<T> {
  const res = await fetch(SURF_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message ?? JSON.stringify(json.error)}`);
  return json.result;
}

// Rent-exempt lamports for an 82-byte SPL Mint (generous, surfnet doesn't reclaim).
const MINT_RENT = 2_000_000;

// Write a fully-initialized SPL Mint account with an exact supply, so that
// getTokenSupply(mint) returns `supply`. This is the lever for the conservation/
// solvency term `cash_supply` — surfnet_setSupply only overrides cluster getSupply.
export async function setSplMint(
  mint: string,
  opts: { supply: bigint; decimals: number; mintAuthority?: string },
): Promise<void> {
  const data = getMintEncoder().encode({
    mintAuthority: (opts.mintAuthority ?? mint) as Address, // some authority; value is irrelevant to supply checks
    supply: opts.supply,
    decimals: opts.decimals,
    isInitialized: true,
    freezeAuthority: null,
  });
  const hex = Buffer.from(data as Uint8Array).toString("hex");
  await rpc("surfnet_setAccount", [
    mint,
    {
      lamports: MINT_RENT,
      data: hex,
      owner: TOKEN_PROGRAM,
      executable: false,
      rent_epoch: 0,
    },
  ]);
}

// Set an owner's associated token account for `mint` to `amount` base units, and
// return the ATA address (the monitor reads it via getTokenAccountBalance).
export async function setTokenBalance(owner: string, mint: string, amount: bigint): Promise<string> {
  await rpc("surfnet_setTokenAccount", [
    owner,
    mint,
    { amount: Number(amount), state: "initialized" },
    TOKEN_PROGRAM,
  ]);
  const [ata] = await findAssociatedTokenPda({
    owner: address(owner),
    mint: address(mint),
    tokenProgram: address(TOKEN_PROGRAM),
  });
  return ata as string;
}

export async function getHealth(): Promise<string> {
  return rpc("getHealth", []);
}
