import { Keypair } from "@solana/web3.js";
import solana from "@wormhole-foundation/sdk/solana";
import { Signer } from "@wormhole-foundation/sdk";

/**
 * Create a Solana signer compatible with the Wormhole SDK.
 */
export async function getSolanaSigner(
  chain: any,
  wallet: Keypair
): Promise<{ addr: string, signer: Signer }> {
  const address = wallet.publicKey.toBase58();

  // Use the Wormhole SDK's getSigner to handle the transaction conversions correctly
  const signer = await (await solana()).getSigner(await chain.getRpc(), address);
  
  return { addr: address, signer };
}
