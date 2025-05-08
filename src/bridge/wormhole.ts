import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import solana from '@wormhole-foundation/sdk/solana';
import sui from '@wormhole-foundation/sdk/sui';
import {
  wormhole,
  Wormhole,
  TokenId,
  amount,
  isTokenId,
  ChainAddress,
  Signer,
} from '@wormhole-foundation/sdk';

import { getSolanaSigner } from '../wallets/solana';
import { getSuiSigner } from '../wallets/sui';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getSDKConfig, getDefaultSolanaRpc } from '../config';

// Convert 'mainnet' ↔ 'Mainnet', 'testnet' ↔ 'Testnet' for Wormhole SDK
function toWormholeNetwork(network: "mainnet" | "testnet"): "Mainnet" | "Testnet" {
	return network === "mainnet" ? "Mainnet" : "Testnet";
}

/**
 * Creates and sends a Wormhole message for a file upload,
 * bridging SOL to Sui and preparing the transfer.
 */
export async function createAndSendWormholeMsg(params: {
  fileHash: string;
  fileSize: number;
  amountSOL: number;
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  };
  suiReceiver?: string;
  suiKeypair: Ed25519Keypair;
}): Promise<string> {
  const { fileHash, fileSize, amountSOL, wallet, suiReceiver, suiKeypair } = params;

  // 1. Get network and config
  const config = getSDKConfig();
  const { network, solanaRpcUrl } = config;
  const rpc = solanaRpcUrl || getDefaultSolanaRpc(network);

  // 2. Init Wormhole
  const wh = await wormhole(toWormholeNetwork(network), [solana, sui]);
  const solChain = wh.getChain("Solana");
  const suiChain = wh.getChain("Sui");

  // 3. Solana signer (now using full wallet)
  const connection = new Connection(rpc);
  const { addr: solAddr, signer: solSigner } = getSolanaSigner(
    solChain,
    wallet,
    connection
  );

  // 4. Sui signer
  const { addr: suiAddr, signer: suiSigner } = getSuiSigner(suiChain, suiKeypair);

  // 5. Prepare token bridge
  const tokenId: TokenId = Wormhole.tokenId('Solana', 'native');
  const solMint = await (solana as any).getOriginalAsset(tokenId);
  const decimals = isTokenId(tokenId)
    ? Number(await wh.getDecimals(tokenId.chain, tokenId.address))
    : solChain.config.nativeTokenDecimals;

  const transferAmount = amount.units(amount.parse(amountSOL.toString(), decimals));

  // 6. Initiate transfer
  const xfer = await wh.tokenTransfer(
    solMint,
    transferAmount,
    solAddr as unknown as ChainAddress,
    suiAddr as unknown as ChainAddress,
    false
  );

  const [solTx, bridgeTx] = await xfer.initiateTransfer(solSigner as unknown as Signer);

  // 7. Wait for VAA
  await xfer.fetchAttestation(5 * 60_000);

  // 8. Complete on Sui
  const suiTxs = await xfer.completeTransfer(suiSigner);

  // 9. Simulated blob ID return (you’ll want to parse actual logs later)
  if (Array.isArray(suiTxs)) return suiTxs[0];
  return suiTxs;
}

// Utility to match Wormhole's network string casing
function capitalize(net: string): string {
  return net.charAt(0).toUpperCase() + net.slice(1).toLowerCase();
}
