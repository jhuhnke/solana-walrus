import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { initializeClients } from "../walrus/client";  

type SuiAddress = {
  chain(): "Sui";
  address(): string;
};

export function getSuiSigner(
  chain: any,
  keypair: Ed25519Keypair
): { addr: SuiAddress; signer: SuiAddress & { sign(tx: any): Promise<any> } } {
  const { suiClient } = initializeClients(); 

  const addr: SuiAddress = {
    chain() { return "Sui"; },
    address() { return keypair.getPublicKey().toSuiAddress(); },
  };

  const signer: SuiAddress & { sign(tx: any): Promise<any> } = {
    chain() { return "Sui"; },
    address() { return keypair.getPublicKey().toSuiAddress(); },
    async sign(tx: any) {
      // Use the keypair's signing method directly
      const txBytes = new TextEncoder().encode(tx);
      const signature = keypair.sign(txBytes);

      return suiClient.signAndExecuteTransaction({
          transaction: tx,
          signer: keypair,
      });
    },
  };

  return { addr, signer };
}
