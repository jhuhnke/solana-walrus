import { WalrusSolanaSDK } from "../sdk";
import { Keypair } from "@solana/web3.js";
import { getWebCryptoSigner } from "../wallets/deriveSuiKeypair"; 
import fs from "fs";
import path from "path";

async function main() {
  try {
    console.log("[🛠️] Configuring SDK...");

    const sdk = new WalrusSolanaSDK({
      network: "testnet",
      suiUrl: "https://fullnode.testnet.sui.io:443",
      solanaRpcUrl: "https://api.devnet.solana.com",
      tokenAddresses: {
        mainnet: {
          wsSol: "So11111111111111111111111111111111111111112",
          wal: "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
          coreBridge: "0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c",
          tokenBridge: "0xc57508ee0d4595e5a8728974a4a93a787d38f339757230d441e895422c07aba9",
        },
        testnet: {
          wsSol: "So11111111111111111111111111111111111111112",
          wal: "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL",
          coreBridge: "0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790",
          tokenBridge: "0x6fb10cdb7aa299e9a4308752dadecb049ff55a892de92992a1edbd7912b3d6da",
        },
      },
    });

    const baseDir = path.resolve(__dirname);
    const solanaWalletPath = path.join(baseDir, "test-wallet.json");

    if (!fs.existsSync(solanaWalletPath)) {
      throw new Error(`[❌] Solana wallet file not found at ${solanaWalletPath}`);
    }

    const secretKeyData = JSON.parse(fs.readFileSync(solanaWalletPath, "utf8"));
    const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(secretKeyData));

    const { signer: suiSigner } = await getWebCryptoSigner(); 

    const blobObjectId = "0x7b9f51ab4655fb9d39e8dce51811baa5f1a282409ca8afb36ab2cee67b30236c";
    console.log(`[🗑️] Attempting to delete blob with ID: ${blobObjectId}`);

    await sdk.delete({
      blobObjectId,
      walletPath: solanaWalletPath,
    });

    console.log(`[✅] Blob successfully deleted: ${blobObjectId}`);
  } catch (error) {
    console.error("[❌] Failed to delete blob:", error);
    process.exit(1);
  }
}

main().catch(console.error);
