import { Connection, PublicKey, Transaction } from '@solana/web3.js';

export interface SolanaWallet {
  publicKey: PublicKey;
  signTransaction: (tx: any) => Promise<any>;
}

export function getSolanaSigner(
  chain: any,
  wallet: SolanaWallet,
  connection: Connection
) {
  const signer = {
    chain: () => "Solana",
    address: () => wallet.publicKey.toBase58(),
    sign: async (txs: Transaction[]) => {
      const signed = await Promise.all(txs.map(wallet.signTransaction));
      return signed;
    },
  };

  return {
    addr: wallet.publicKey.toBase58(),
    signer,
  };
}
