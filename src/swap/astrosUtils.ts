import { DeepBookClient } from "@mysten/deepbook-v3";
import { requestSuiFromFaucetV2, getFaucetHost } from "@mysten/sui/faucet";
import { getSuiClient } from "../config";
import fs from "fs";
import { Transaction } from "@mysten/sui/transactions";

export async function isAstrosGasFreeSwapAvailable(
    walCoinType: string,
    amount: string,
    sender: string,
    network: "testnet" | "mainnet",
    mnemonicPath: string
): Promise<boolean> {
    // ✅ Force SUI for testnet
    const fromCoinType = network === "testnet" ? "0x2::sui::SUI" : walCoinType;

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

        if (network === "testnet" && currentBalance < minimumBalance) {
            console.log(`[🚰] Funding testnet account: ${sender}...`);
            const host = getFaucetHost("testnet");
            const faucetResponse = await requestSuiFromFaucetV2({
                host,
                recipient: sender,
            });
            console.log(`[✅] Testnet faucet response:`, faucetResponse);
        } else if (network === "testnet") {
            console.log("[✅] Account has sufficient SUI. Skipping faucet.");
        }

        // ✅ Initialize DeepBook
        console.log(`[🔄] Initializing DeepBook for network: ${network.toUpperCase()}...`);
        const deepBook = new DeepBookClient("testnet");
        await deepBook.init();

        // ✅ Create a transaction block for the swap
        const tx = new Transaction();

        console.log("[🔄] Creating DeepBook swap transaction...");
        const [baseOut, quoteOut, deepOut] = deepBook.swapExactBaseForQuote({
            poolKey: "WAL_SUI",
            amount: BigInt(amount),
            deepAmount: BigInt(1),  // Just a small fee to cover
            minOut: BigInt(1),  // Minimum WAL to receive
        })(tx);

        // ✅ Transfer the swapped WAL back to the sender
        tx.transferObjects([baseOut, quoteOut, deepOut], sender);

        console.log(`[✅] Swap transaction created:`, tx);

        // ✅ Execute the transaction
        const txResponse = await suiClient.signAndExecuteTransaction({
            transaction: tx,
            signer: suiClient.getSigner(mnemonic),
        });

        console.log(`[✅] Swap executed successfully:`, txResponse);
        return true;

    } catch (error) {
        console.error("[❌] DeepBook SDK Error:", error);
        return false;
    }
}
