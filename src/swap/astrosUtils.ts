import { requestSuiFromFaucetV2, getFaucetHost } from "@mysten/sui/faucet";
import { getSuiClient } from "../config";
import { fetchConversionRates } from "../utils/encoding";
import { swapWSOLtoWAL } from "./dexRouter";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import fs from "fs";
import { execSync } from "child_process";

/**
 * Attempts a gas-free swap of WSOL → WAL on mainnet or SUI → WAL on testnet.
 * @param amountInWSOL - Exact WSOL amount received on SUI, in base units (lamports).
 */
export async function isAstrosGasFreeSwapAvailable(
  walCoinType: string,
  amountInWSOL: number,
  sender: string,
  network: "testnet" | "mainnet",
  mnemonicPath: string,
  suiCliPath?: string
): Promise<boolean> {
  try {
    const suiClient = getSuiClient();

    // ✅ Testnet Flow: swap SUI → WAL using CLI
    if (network === "testnet") {
      const balances = await suiClient.getBalance({
        owner: sender,
        coinType: "0x2::sui::SUI",
      });

      const currentBalance = Number(balances.totalBalance || "0");
      console.log(`[🪙] Current SUI balance: ${(currentBalance / 1e9).toFixed(4)} SUI`);

      if (currentBalance < 1e9) {
        console.log(`[🚰] Funding testnet account: ${sender}...`);
        const host = getFaucetHost("testnet");
        const faucetResponse = await requestSuiFromFaucetV2({ host, recipient: sender });
        console.log(`[✅] Faucet response:`, faucetResponse);
      } else {
        console.log("[✅] Account has sufficient SUI. Skipping faucet.");
      }

      const { walToSol, suiToSol } = await fetchConversionRates();
      const estimatedSUI = amountInWSOL * (walToSol / suiToSol);
      const estimatedSUIInMist = Math.floor(estimatedSUI).toString();
      console.log(`[💱] Estimated SUI for ${amountInWSOL} WAL: ${estimatedSUIInMist} MIST`);

      const walrusPath = suiCliPath || "/usr/local/bin/walrus";
      if (!fs.existsSync(walrusPath)) {
        throw new Error(`[❌] Walrus CLI not found at ${walrusPath}`);
      }

      const cmd = `${walrusPath} get-wal --amount ${estimatedSUIInMist}`;
      console.log(`[📝] Swap command: ${cmd}`);

      const output = execSync(cmd, {
        stdio: "pipe",
        env: process.env,
        shell: "/bin/bash",
        encoding: "utf-8",
      });

      console.log(`[✅] SUI → WAL swap successful:`, output);
      return true;
    }

    // ✅ Mainnet Flow: swap WSOL → WAL using Aftermath
    console.log(`[📈] Swapping exactly ${amountInWSOL} WSOL → WAL`);

    if (!fs.existsSync(mnemonicPath)) {
      throw new Error(`[❌] Mnemonic file not found at ${mnemonicPath}`);
    }

    const mnemonicData = JSON.parse(fs.readFileSync(mnemonicPath, "utf8"));
    const mnemonic = mnemonicData.mnemonic;
    if (!mnemonic) {
      throw new Error("[❌] Mnemonic file is missing the 'mnemonic' key");
    }

    const suiKeypair = Ed25519Keypair.deriveKeypair(mnemonic);

    const swapConfig = {
      wSol: "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
      wal: walCoinType,
    };

    console.log(`[🔁] Swap config: WSOL = ${swapConfig.wSol}, WAL = ${swapConfig.wal}`);
    console.log(`[🔑] Sender: ${sender}`);

    const txDigest = await swapWSOLtoWAL({
      signer: suiKeypair,
      wsSolCoinType: swapConfig.wSol,
      walCoinType: swapConfig.wal,
      amount: amountInWSOL.toString(), 
    });

    console.log(`[✅] Aftermath swap complete. TX: ${txDigest}`);
    return true;

  } catch (error) {
    console.error("[❌] Swap failed:", error);
    return false;
  }
}
