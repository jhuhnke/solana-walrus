import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createSyncNativeInstruction,
} from "@solana/spl-token";
import {
    wormhole,
    Wormhole,
    TokenId,
    amount,
    isTokenId,
} from "@wormhole-foundation/sdk";
import solana from "@wormhole-foundation/sdk/solana";
import sui from "@wormhole-foundation/sdk/sui";

import { getSolanaSigner } from "../wallets/solana";
import { getSuiSigner } from "../wallets/sui";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getSDKConfig, getDefaultSolanaRpc } from "../config";
import fs from "fs";

function toWormholeNetwork(net: string): "Mainnet" | "Testnet" {
    return net === "mainnet" ? "Mainnet" : "Testnet";
}

export async function createAndSendWormholeMsg(params: {
    fileHash: string;
    fileSize: number;
    amountSOL: number;
    wallet: Keypair;
    suiReceiver?: string;
    suiKeypair: Ed25519Keypair;
    mnemonicPath: string;
}): Promise<string> {
    const { amountSOL, wallet, mnemonicPath } = params;

    const config = getSDKConfig();
    const rpc = config.solanaRpcUrl || getDefaultSolanaRpc(config.network);
    const connection = new Connection(rpc, "confirmed");

    const wh = await wormhole(toWormholeNetwork(config.network), [solana, sui], {
        chains: {
            Sui: {
                rpc: "https://fullnode.mainnet.sui.io:443",
                contracts: {
                    coreBridge: "0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c", ///"0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790", 
                    tokenBridge: "0xc57508ee0d4595e5a8728974a4a93a787d38f339757230d441e895422c07aba9", //"0x6fb10cdb7aa299e9a4308752dadecb049ff55a892de92992a1edbd7912b3d6da",
                },
            },
        },
    });

    const actualBridge = wh.getChain("Sui").config.contracts.tokenBridge;
    if (actualBridge.startsWith("0x26")) {
        throw new Error(`[❌] Contract override NOT applied. Deprecated tokenBridge package: ${actualBridge}`);
    }

    const { addr: solAddr, signer: solSigner } = await getSolanaSigner(wh.getChain("Solana"), wallet);
    const { addr: suiAddr, signer: suiSigner } = await loadSuiSigner(mnemonicPath);

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

    const transferAmount = amount.units(amount.parse(amountSOL.toFixed(decimals), decimals));
    console.log(`[💰] Wormhole Transfer amount: ${transferAmount.toString()} units`);

    const mint = new PublicKey(wsSol);
    const ata = await getAssociatedTokenAddress(mint, wallet.publicKey);
    const account = await connection.getAccountInfo(ata);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");

    const tx = new Transaction({
        feePayer: wallet.publicKey,
        recentBlockhash: blockhash,
    });

    if (!account) {
        tx.add(createAssociatedTokenAccountInstruction(wallet.publicKey, ata, wallet.publicKey, mint));
    }

    tx.add(
        SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: ata,
            lamports: BigInt(transferAmount.toString()),
        }),
        createSyncNativeInstruction(ata)
    );

    await sendAndConfirmTransaction(connection, tx, [wallet], {
        commitment: "finalized",
        minContextSlot: lastValidBlockHeight,
    });

    console.log(`[✅] WSOL funded ATA: ${ata.toBase58()}`);

    const xfer = await wh.tokenTransfer(
        tokenId,
        transferAmount,
        Wormhole.chainAddress("Solana", solAddr),
        Wormhole.chainAddress("Sui", suiAddr.address()),
        false
    );

    console.log("[🚀] Initiating Wormhole transfer...");
    const [solTx, bridgeTx] = await xfer.initiateTransfer(solSigner);
    console.log(`[✅] Solana TX: ${solTx}; Bridge TX: ${bridgeTx}`);

    console.log("[⏳] Waiting for VAA...");
    const vaa = await xfer.fetchAttestation(10 * 60_000);
    console.log("[✅] VAA received. Attempting Sui claim...");
    await new Promise((res) => setTimeout(res, 60000));
    try{ 
        const suiTxs = await xfer.completeTransfer(suiSigner);
        console.log(`[✅] Sui claim succeeded with TX: ${suiTxs}`);
        return Array.isArray(suiTxs) ? suiTxs[0] : suiTxs;
    } catch (err: any) {
        const msg = err?.message || err?.toString() || "";
        const isTransient = msg.includes("Package object does not exist")
            || msg.includes("coin::update_symbol")
            || msg.includes("assert_package_upgrade_cap")
            || msg.includes("get_decimals")
            || msg.includes("token_address");

        if (!isTransient) throw err;

        await new Promise((res) => setTimeout(res, 5000));
    }
}

async function loadSuiSigner(mnemonicPath: string) {
    if (!fs.existsSync(mnemonicPath)) {
        throw new Error(`[❌] Sui wallet file not found at ${mnemonicPath}`);
    }
    const data = JSON.parse(fs.readFileSync(mnemonicPath, "utf8"));
    const mnemonic = data.mnemonic;
    if (!mnemonic || typeof mnemonic !== "string") {
        throw new Error(`[❌] Invalid mnemonic in file: ${mnemonicPath}`);
    }
    return await getSuiSigner(mnemonic);
}
