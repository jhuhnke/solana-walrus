import { getStorageQuote, hashFile } from "../utils/encoding";
import { createAndSendWormholeMsg } from "../bridge/wormhole";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { UploadOptions } from "../types";
import { getSDKConfig } from "../config";
import { transferProtocolFee } from "../bridge/treasury";
import { isAstrosGasFreeSwapAvailable } from "../swap/astrosUtils";
import { finalizeUploadOnSui } from "../walrus/upload";
import { getCachedOrCreateSuiKeypair } from "../wallets/deriveSuiKeypair";

export async function uploadFile(options: UploadOptions): Promise<string> {
    const {
        file,
        wallet,
        suiReceiverAddress,
        suiKeypair: userProvidedSuiKeypair,
        epochs,
        deletable,
        connection,
    } = options;

    const config = getSDKConfig();

    // ✅ 0. Enforce correct wallet type
    if (!(wallet instanceof Keypair)) {
        throw new Error("[Walrus SDK] Expected a Solana Keypair for the payer.");
    }

    // ✅ 1. Use or generate Sui keypair
    const suiKeypair = userProvidedSuiKeypair || getCachedOrCreateSuiKeypair(wallet.publicKey);

    // ✅ 2. Select Solana RPC
    const solanaConnection =
        connection || new Connection(config.solanaRpcUrl || getDefaultSolanaRpc(config.network));

    // ✅ 3. Get file size + hash
    const fileSize = file.size;
    const fileHash = await hashFile(file);
    const fileBytes = new Uint8Array(await file.arrayBuffer());

    // ✅ 4. Get quote from Walrus
    const quote = await getStorageQuote({ bytes: fileSize, epochs, deletable });
    const estimatedSOL = quote.totalCost;

    // ✅ 5. Get token info and Sui address
    const { wsSol, wal } = config.tokenAddresses[config.network];
    const suiReceiver = suiReceiverAddress || suiKeypair.getPublicKey().toSuiAddress();

    // ✅ 6. Check Astros gas sponsorship
    const gasFree = await isAstrosGasFreeSwapAvailable(
        wsSol,
        wal,
        (estimatedSOL * 1e9).toFixed(0),
        suiReceiver
    );

    // ✅ 7. Apply protocol fee
    const protocolFeePercent = gasFree ? 0.01 : 0.02;
    const totalSOL = estimatedSOL * (1 + protocolFeePercent);

    // ✅ 8. Transfer protocol fee to treasury
    const { remainingSOL } = await transferProtocolFee({
        connection: solanaConnection,
        payer: wallet,
        amountSOL: totalSOL,
    });

    // ✅ 9. Send Wormhole message from Solana → Sui
    await createAndSendWormholeMsg({
		fileHash,
		fileSize,
		amountSOL: remainingSOL,
		wallet: {
			publicKey: wallet.publicKey,
			signTransaction: async (tx) => {
				tx.partialSign(wallet);
				return tx;
			},
		},
		suiReceiver,
		suiKeypair,
	});

    // ✅ 10. Upload file blob on Sui
    const result = await finalizeUploadOnSui({
        suiKeypair,
        fileBytes,
        epochs,
        deletable,
    });

    // ✅ 11. Return blob ID to caller
    return result.blobId;
}

// 🔧 RPC fallback
function getDefaultSolanaRpc(network: "mainnet" | "testnet"): string {
    return network === "mainnet"
        ? "https://api.mainnet-beta.solana.com"
        : "https://api.testnet.solana.com";
}
