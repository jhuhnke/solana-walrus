import { requestSuiFromFaucetV2, getFaucetHost } from "@mysten/sui/faucet";
import { getSuiClient } from "../config";
import { fetchConversionRates } from "../utils/encoding";
import fs from "fs";
import { execSync } from "child_process";

/**
 * Checks if a gas-free WAL swap is possible.
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
        // ✅ Validate network
        if (network !== "testnet") {
            console.log("[⚠️] Only testnet is supported for SUI -> WAL swaps.");
            return false;
        }

        // ✅ Validate mnemonic file
        if (!fs.existsSync(mnemonicPath)) {
            throw new Error(`[❌] Mnemonic file not found at ${mnemonicPath}`);
        }

        const mnemonicData = JSON.parse(fs.readFileSync(mnemonicPath, "utf8"));
        const mnemonic = mnemonicData.mnemonic;
        if (!mnemonic) {
            throw new Error("[❌] Mnemonic file is missing the 'mnemonic' key");
        }

        // ✅ Check SUI balance
        const suiClient = getSuiClient();
        const balances = await suiClient.getBalance({
            owner: sender,
            coinType: "0x2::sui::SUI",
        });

        const currentBalance = Number(balances.totalBalance || "0");
        console.log(`[🪙] Current SUI balance: ${(currentBalance / 1e9).toFixed(4)} SUI`);

        // Ensure account has enough SUI for the swap
        const minimumSUI = 1 * 1e9;  // 1 SUI (in lamports)
        if (currentBalance < minimumSUI) {
            console.log(`[🚰] Funding testnet account: ${sender}...`);
            const host = getFaucetHost("testnet");
            const faucetResponse = await requestSuiFromFaucetV2({
                host,
                recipient: sender,
            });
            console.log(`[✅] Testnet faucet response:`, faucetResponse);
        } else {
            console.log("[✅] Account has sufficient SUI. Skipping faucet.");
        }

        // ✅ Fetch WAL → SOL and SUI → SOL conversion rates
        const { walToSol, suiToSol } = await fetchConversionRates();

        // ✅ Convert WAL to SUI for the swap
        const estimatedSUI = amountInWAL * (walToSol / suiToSol);
        console.log(`[💱] Estimated SUI for ${amountInWAL / 10e9} WAL: ${estimatedSUI / 10e9} SUI`);

        // ✅ Convert to Mist for the CLI command
        const estimatedSUIInMist = Math.floor(estimatedSUI).toString();
        console.log(`[📝] Amount in Mist: ${estimatedSUIInMist}`);

        // ✅ Validate WAL swap command
        const defaultWalrusPath = "/usr/local/bin/walrus";
        const walrusPath = suiCliPath || defaultWalrusPath;

        if (!fs.existsSync(walrusPath) || !fs.statSync(walrusPath).isFile()) {
            throw new Error(`[❌] Walrus CLI not found at ${walrusPath}`);
        }

        // ✅ Run the WAL swap command
        const swapCommand = `${walrusPath} get-wal --amount ${estimatedSUIInMist}`;
        console.log(`[📝] Swap command: ${swapCommand}`);

        const swapOutput = execSync(swapCommand, {
            stdio: "pipe",
            env: process.env,
            shell: "/bin/bash",
            encoding: "utf-8",
        });

        console.log(`[✅] SUI -> WAL swap successful:`, swapOutput);
        return true;

    } catch (error) {
        console.error("[❌] Swap failed:", error);
        return false;
    }
}
