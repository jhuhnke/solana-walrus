import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import solana from '@wormhole-foundation/sdk/solana';
import sui from '@wormhole-foundation/sdk/sui';
import {
  wormhole,
  Wormhole,
  TokenId,
  amount,
  isTokenId,
  ChainAddress,
  Signer
} from '@wormhole-foundation/sdk';
import { getSolanaSigner } from '../wallets/solana';
import { getSuiSigner } from '../wallets/sui';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getSDKConfig, getDefaultSolanaRpc } from '../config';

/**
 * Converts 'mainnet' ↔ 'Mainnet', 'testnet' ↔ 'Testnet' for Wormhole SDK.
 */
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
      signTransaction: (tx: Transaction | Uint8Array | VersionedTransaction) => Promise<Uint8Array>;
  };
  suiReceiver?: string;
  suiKeypair: Ed25519Keypair;
}): Promise<string> {
  const { fileHash, fileSize, amountSOL, wallet, suiReceiver, suiKeypair } = params;

  try {
    // ✅ 1. Load SDK configuration
    const config = getSDKConfig();
    const { network, solanaRpcUrl } = config;
    const rpc = solanaRpcUrl || getDefaultSolanaRpc(network);
    console.log(`[🌐] Using RPC: ${rpc}`);

    // ✅ 2. Initialize Wormhole SDK
    const wh = await wormhole(toWormholeNetwork(network), [solana, sui]);
    const solChain = wh.getChain("Solana");
    const suiChain = wh.getChain("Sui");
    console.log("[🔗] Wormhole SDK initialized.");

    // ✅ 3. Prepare Solana signer
    const connection = new Connection(rpc);
    const { addr: solAddr, signer: solSigner } = getSolanaSigner(solChain, wallet, connection);
    console.log(`[🔑] Solana address: ${solAddr.toString()}`);

    // ✅ 4. Prepare Sui signer
    const { addr: suiAddr, signer: suiSigner } = getSuiSigner(suiChain, suiKeypair);
    console.log(`[🔑] Sui address: ${suiAddr.toString()}`);

    // ✅ 5. Get WSOL token address
    const wsSolAddress = config.tokenAddresses[network].wsSol;

    // Use the actual Wormhole Token ID for WSOL
    const tokenId: TokenId = Wormhole.tokenId("Solana", wsSolAddress);
    console.log(`[🪙] WSOL Token ID: ${tokenId.chain} / ${tokenId.address}`);

    // ✅ 6. Normalize the amount
    let decimals = solChain.config.nativeTokenDecimals;

    if (isTokenId(tokenId)) {
        const fetchedDecimals = await wh.getDecimals(tokenId.chain, tokenId.address);
        if (fetchedDecimals === undefined || fetchedDecimals === null || isNaN(Number(fetchedDecimals))) {
            throw new Error(`[❌] Failed to fetch decimals for token ${tokenId.address}`);
        }
        decimals = Number(fetchedDecimals);
    }
    console.log(`[🪙] Using ${decimals} decimals for token ${tokenId.address}`);

    // Convert to smallest units
    const transferAmount = amount.units(amount.parse(amountSOL.toFixed(decimals), decimals));
    console.log(`[💰] Transfer amount: ${transferAmount.toString()} units`);

    // ✅ 7. Initiate transfer
    console.log("[🚀] Initiating token transfer...");
    const xfer = await wh.tokenTransfer(
      tokenId,
      transferAmount,
      Wormhole.chainAddress("Solana", solAddr.toString()),
      Wormhole.chainAddress("Sui", suiKeypair.getPublicKey().toSuiAddress()),
      false
    );

    const [solTx, bridgeTx] = await xfer.initiateTransfer(solSigner as unknown as Signer);
    console.log(`[🚀] Initiated transfer: ${solTx}, ${bridgeTx}`);

    // ✅ 8. Wait for VAA (up to 5 minutes)
    console.log("[⏳] Waiting for VAA...");
    await xfer.fetchAttestation(5 * 60_000);
    console.log("[✅] VAA received.");

    // ✅ 9. Complete transfer on Sui
    console.log("[🔄] Completing transfer on Sui...");
    const suiTxs = await xfer.completeTransfer(suiSigner);
    console.log(`[✅] Transfer completed on Sui. TXs: ${suiTxs}`);

    // ✅ 10. Extract and return the first transaction ID as the blob ID
    const blobId = Array.isArray(suiTxs) ? suiTxs[0] : suiTxs;
    console.log(`[✅] Blob ID: ${blobId}`);
    return blobId;

  } catch (error) {
    console.error("[❌] Wormhole transfer failed:", error);
    throw error;
  }
}
