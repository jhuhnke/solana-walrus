import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import solana from "@wormhole-foundation/sdk/solana";
import sui from "@wormhole-foundation/sdk/sui";
import {
  wormhole,
  Wormhole,
  TokenId,
  amount,
  isTokenId,
  Signer,
} from "@wormhole-foundation/sdk";
import { getSolanaSigner } from "../wallets/solana";
import { getSuiSigner } from "../wallets/sui";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getSDKConfig, getDefaultSolanaRpc } from "../config";
import { Keypair } from '@solana/web3.js';
import fs from 'fs';

/** Maps your network key to the SDK enum. */
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
  wallet: Keypair;
  suiReceiver?: string;
  suiKeypair: Ed25519Keypair;
  mnemonicPath: string;
}): Promise<string> {
  const { fileHash, fileSize, amountSOL, wallet, suiReceiver, suiKeypair } = params;

  // 1. Load SDK config & determine RPC URL
  const config = getSDKConfig();
  const rpc = config.solanaRpcUrl || getDefaultSolanaRpc(config.network);

  // 2. Initialize Wormhole SDK with custom Solana RPC
  const wh = await wormhole(
    toWormholeNetwork(config.network), 
    [solana, sui]
  );
  console.log("[🔗] Wormhole SDK initialized.");

  // 3. Prepare Solana signer using the same RPC
  const connection = new Connection(rpc, "confirmed");
  const { addr: solAddr, signer: solSigner } = await getSolanaSigner(
      wh.getChain("Solana"),
      wallet
  );

  // 4. Prepare Sui signer
  async function loadSuiSigner(mnemonicPath: string) {
      if (!fs.existsSync(mnemonicPath)) {
          throw new Error(`[❌] Sui wallet file not found at ${mnemonicPath}`);
      }

      const importData = JSON.parse(fs.readFileSync(mnemonicPath, "utf8"));
      const mnemonic = importData.mnemonic;

      if (!mnemonic || typeof mnemonic !== "string") {
          throw new Error(`[❌] Invalid mnemonic in file: ${mnemonicPath}`);
      }

      const { addr, signer } = await getSuiSigner(mnemonic);
      return { addr, signer };
  }

  // Use the provided mnemonic path from params
  const { addr: suiAddr, signer: suiSigner } = await loadSuiSigner(params.mnemonicPath);


  // 5. Determine WSOL TokenId & decimals
  const wsSol = config.tokenAddresses[config.network].wsSol;
  const tokenId: TokenId = Wormhole.tokenId("Solana", wsSol);
  let decimals = wh.getChain("Solana").config.nativeTokenDecimals;
  if (isTokenId(tokenId)) {
    const d = await wh.getDecimals(tokenId.chain, tokenId.address);
    if (d == null || isNaN(Number(d))) {
      throw new Error(`[❌] Failed to fetch decimals for token ${tokenId.address}`);
    }
    decimals = Number(d);
  }

  // 6. Compute transfer amount in smallest units
  const transferAmount = amount.units(
    amount.parse(amountSOL.toFixed(decimals), decimals)
  );
  console.log(`[💰] Wormhole Transfer amount: ${transferAmount.toString()} units`);

  // 7. Build and send the Wormhole transfer
  const xfer = await wh.tokenTransfer(
    tokenId,
    transferAmount,
    Wormhole.chainAddress("Solana", solAddr),
    Wormhole.chainAddress("Sui", suiAddr.address()),
    false
  );

  // 8. Sign and send the Solana transfer
  console.log("[🚀] Initiating wormhole token transfer...");
  const [solTx, bridgeTx] = await xfer.initiateTransfer(solSigner);
  console.log(`[🚀] Solana TX: ${solTx}; Bridge TX: ${bridgeTx}`);

  // 9. Wait for VAA (attestation)
  console.log("[⏳] Waiting for VAA...");
  await xfer.fetchAttestation(10 * 60_000);
  console.log("[✅] VAA received.");

  // 10. Complete transfer on Sui
  console.log("[🔄] Completing transfer on Sui...");
  const suiTxs = await xfer.completeTransfer(suiSigner);
  console.log(`[✅] Transfer completed on Sui. TXs: ${suiTxs}`);

  // 11. Return the first Sui TX as the blob ID
  return Array.isArray(suiTxs) ? suiTxs[0] : suiTxs;
}
