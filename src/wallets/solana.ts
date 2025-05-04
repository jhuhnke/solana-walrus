import { Keypair, Transaction, Connection, sendAndConfirmTransaction } from '@solana/web3.js';

export type SolanaAddress = {
  chain: any;     
  address: string;    
};


export type SolanaSigner = {
  sign(tx: Transaction): Promise<string>; 
};

export function getSolanaSigner(
  chain: any,
  wallet: Keypair,
  connection: Connection
): { addr: SolanaAddress; signer: SolanaSigner } {
  const addr: SolanaAddress = {
    chain:   "Solana",
    address: wallet.publicKey.toBase58(),
  };

  const signer: SolanaSigner = {
    async sign(tx: Transaction) {
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer        = wallet.publicKey;
      tx.sign(wallet);
      return sendAndConfirmTransaction(connection, tx, [wallet]);
    }
  };

  return { addr, signer };
}
