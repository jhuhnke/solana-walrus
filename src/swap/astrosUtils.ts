import { requestSuiFromFaucetV2, getFaucetHost } from "@mysten/sui/faucet";
import { getSuiClient } from "../config";
import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import os from "os";

export async function isAstrosGasFreeSwapAvailable(
    walCoinType: string,
    amount: string,
    sender: string,
    network: "testnet" | "mainnet",
    mnemonicPath: string,
    suiCliPath?: string  // ✅ Optional CLI path
): Promise<boolean> {
    if (network !== "testnet") {
        console.log("[⚠️] Only testnet is supported for SUI -> WAL swaps.");
        return false;
    }

    // ✅ Load mnemonic from user-provided file
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

        const minimumBalance = 0.5 * 1e9; // 0.5 SUI
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

        // ✅ Use the Walrus CLI for the swap
        const walrusPath = suiCliPath || "/home/jhuhnke/.local/bin/walrus";  // Default to known path

        // ✅ Check if the walrus CLI is executable
        if (!fs.existsSync(walrusPath) || !fs.statSync(walrusPath).isFile()) {
            throw new Error(`[❌] Walrus CLI not found at ${walrusPath}`);
        }

        console.log("[🔄] Attempting SUI -> WAL swap via CLI...");
        const swapCommand = `${walrusPath} get-wal --amount 1000000000`;

        console.log(`[📝] Swap command: ${swapCommand}`);

        // ✅ Execute the swap command with the correct shell
        const shell = os.platform() === "win32" ? "powershell.exe" : "/bin/bash";
        const swapOutput = execSync(swapCommand, {
            stdio: "pipe",
            env: process.env,
            shell,
        }).toString();

        console.log(`[✅] SUI -> WAL swap successful:`, swapOutput);

        return true;

    } catch (error) {
        console.error("[❌] Swap Error:", error);
        return false;
    }
}
