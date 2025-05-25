import { requestSuiFromFaucetV2, getFaucetHost } from "@mysten/sui/faucet";
import { getSuiClient } from "../config";
import { fetchConversionRates } from "../utils/encoding";
import { swapWSOLtoWAL } from "./dexRouter";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import fs from "fs";
import { execSync } from "child_process";

/**
 * Attempts a gas-free swap of WSOL → WAL on mainnet or SUI → WAL on testnet.
 */
export async function isAstrosGasFreeSwapAvailable(
    walCoinType: string,
    amountInWAL: number,
    sender: string,
    network: "testnet" | "mainnet",
    mnemonicPath: string,
    suiCliPath?: string
): Promise<boolean> {
    try {
        const suiClient = getSuiClient();

        // ✅ Testnet Flow (SUI -> WAL via CLI)
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
            const estimatedSUI = amountInWAL * (walToSol / suiToSol);
            const estimatedSUIInMist = Math.floor(estimatedSUI).toString();
            console.log(`[💱] Estimated SUI for ${amountInWAL} WAL: ${estimatedSUIInMist} MIST`);

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

        // ✅ Mainnet Flow (WSOL -> WAL via Aftermath)
        const estimatedWAL = amountInWAL * 1.05; // 5% buffer
        console.log(`[📈] Estimating mainnet swap for ${estimatedWAL.toFixed(9)} WAL`);

        // ✅ Derive Sui keypair directly from mnemonic
        if (!fs.existsSync(mnemonicPath)) {
            throw new Error(`[❌] Mnemonic file not found at ${mnemonicPath}`);
        }

        const mnemonicData = JSON.parse(fs.readFileSync(mnemonicPath, "utf8"));
        const mnemonic = mnemonicData.mnemonic;
        if (!mnemonic) {
            throw new Error("[❌] Mnemonic file is missing the 'mnemonic' key");
        }

        const suiKeypair = Ed25519Keypair.deriveKeypair(mnemonic);

        const config = {
            wsSol: "0x2::coin::COIN<0x5::wsol::WSOL>",
            wal: walCoinType,
        };

        const amountInLamports = Math.floor(estimatedWAL * 1e9).toString();

        const txDigest = await swapWSOLtoWAL({
            signer: suiKeypair,
            wsSolCoinType: config.wsSol,
            walCoinType: config.wal,
            amount: amountInLamports,
        });

        console.log(`[✅] Aftermath swap complete. TX: ${txDigest}`);
        return true;

    } catch (error) {
        console.error("[❌] Swap failed:", error);
        return false;
    }
}
