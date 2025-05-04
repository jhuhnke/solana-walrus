import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';

type SuiAddress = {
  chain(): "Sui";
  address(): string;
};

export function getSuiSigner(
  chain: any,
  keypair: Ed25519Keypair
): { addr: SuiAddress; signer: SuiAddress & { sign(tx: any): Promise<any> } } {
  const provider: SuiClient = chain.provider;

  const addr: SuiAddress = {
    chain() { return "Sui"; },
    address() { return keypair.getPublicKey().toSuiAddress(); },
  };

  const signer: SuiAddress & { sign(tx: any): Promise<any> } = {
    chain() { return "Sui"; },
    address() { return keypair.getPublicKey().toSuiAddress(); },
    async sign(tx: any) {
      return provider.signAndExecuteTransaction({ transaction: tx, signer: keypair });
    },
  };

  return { addr, signer };
}
