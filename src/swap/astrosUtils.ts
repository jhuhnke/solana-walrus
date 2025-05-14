import { requestSuiFromFaucetV2, getFaucetHost } from "@mysten/sui/faucet";
import { getSuiClient } from "../config";
import fs from "fs";
import { execSync } from "child_process";

export async function isAstrosGasFreeSwapAvailable(
    walCoinType: string,
    amount: string,
    sender: string,
    network: "testnet" | "mainnet",
    mnemonicPath: string,
    suiCliPath?: string  
): Promise<boolean> {
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

    try {
        const suiClient = getSuiClient();

        // ✅ Check if the account already has enough SUI
        const balances = await suiClient.getBalance({
            owner: sender,
            coinType: "0x2::sui::SUI",
        });

        const minimumBalance = 1 * 1e9;
        const currentBalance = Number(balances.totalBalance || "0");

        console.log(`[🪙] Current SUI balance: ${(currentBalance / 1e9).toFixed(4)} SUI`);

        if (currentBalance < minimumBalance) {
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

        // ✅ Determine Walrus CLI path
        const defaultWalrusPath = "/usr/local/bin/walrus";
        const walrusPath = suiCliPath || defaultWalrusPath;

        // ✅ Validate Walrus CLI executable
        if (!fs.existsSync(walrusPath) || !fs.statSync(walrusPath).isFile()) {
            throw new Error(`[❌] Walrus CLI not found at ${walrusPath}`);
        }

        // ✅ Run the SUI -> WAL swap command
        console.log("[🔄] Attempting SUI -> WAL swap via CLI...");
        const swapCommand = `walrus get-wal --amount ${amount}`;
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
        if (error instanceof Error) {
            console.error("❌ Swap failed:", error.message);
        } else {
            console.error("❌ Unknown swap error:", error);
        }
        return false;
    }
}
