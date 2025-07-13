import { Aftermath } from "aftermath-ts-sdk";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { WebCryptoSigner } from "@mysten/signers/webcrypto";

// === HARDCODED INPUTS ===
const AMOUNT_LAMPORTS = 15_343n;
const WSOL_TYPE =
  "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN";
const WAL_TYPE =
  "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL";
const RPC_URL = getFullnodeUrl("mainnet");

async function main() {
  const signer = await WebCryptoSigner.generate(); 
  const sender = signer.getPublicKey().toSuiAddress();
  console.log(`[🔑] Sender: ${sender}`);

  const sui = new SuiClient({ url: RPC_URL });

  const sdk = new Aftermath("MAINNET");
  await sdk.init();
  const router = sdk.Router();

  const route = await router.getCompleteTradeRouteGivenAmountIn({
    coinInType: WSOL_TYPE,
    coinOutType: WAL_TYPE,
    coinInAmount: AMOUNT_LAMPORTS,
  });

  if (!route) throw new Error("No viable trade route found");

  const tx = await router.getTransactionForCompleteTradeRoute({
    walletAddress: sender,
    completeRoute: route,
    slippage: 0.02,
  });

  const result = await sui.signAndExecuteTransaction({
    signer,
    transaction: tx,
    options: { showEffects: true, showInput: true },
  });

  if (result.effects?.status.status !== "success") {
    console.error("[❌] Swap failed:", result.effects?.status);
    throw new Error("Swap transaction failed");
  }

  console.log(`[✅] Swap successful! TX digest: ${result.digest}`);
}

main().catch((err) => {
  console.error("[❌] Fatal error:", err.message);
  process.exit(1);
});
