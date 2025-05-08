import { 
    Connection, 
    PublicKey, 
    Transaction, 
    SystemProgram, 
    sendAndConfirmTransaction, 
    Keypair, 
} from '@solana/web3.js'; 
import { PROTOCOL_TREASURY_ADDRESS } from '../config'; 

export async function transferProtocolFee({
    connection, 
    payer, 
    amountSOL, 
}: {
    connection: Connection; 
    payer: Keypair; 
    amountSOL: number; 
}): Promise<{
    remainingSOL: number; 
    feePaid: number;
}> {
    const treasuryPubkey = new PublicKey(PROTOCOL_TREASURY_ADDRESS); 
    const feePercent = 0.01; 
    const feeAmount = amountSOL * feePercent; 

    const lamports = Math.round(feeAmount * 1e9); 

    // ✅ Add recent blockhash
    const recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

    const transaction = new Transaction({
        recentBlockhash,
        feePayer: payer.publicKey,
    }).add(
        SystemProgram.transfer({
            fromPubkey: payer.publicKey, 
            toPubkey: treasuryPubkey, 
            lamports,
        })
    ); 

    // ✅ Sign and send transaction
    transaction.partialSign(payer);
    await sendAndConfirmTransaction(connection, transaction, [payer]);

    return {
        remainingSOL: amountSOL - feeAmount, 
        feePaid: feeAmount, 
    };
}
