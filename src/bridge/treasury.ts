import { 
    Connection, 
    PublicKey, 
    Transaction, 
    SystemProgram, 
    sendAndConfirmTransaction
} from '@solana/web3.js'; 
import { PROTOCOL_TREASURY_ADDRESS } from '../config'; 

export async function transferProtocolFee({
    connection, 
    payer, 
    amountSOL, 
}: {
    connection: Connection; 
    payer: {
        publicKey: PublicKey; 
        signTransaction: (tx: Transaction) => Promise<Transaction>
    }; 
    amountSOL: number; 
}): Promise<{
    remainingSOL: number; 
    feePaid: number;
}> {
    const treasuryPubkey = new PublicKey(PROTOCOL_TREASURY_ADDRESS); 
    const feePercent = 0.01; 
    const feeAmount = amountSOL & feePercent; 

    const lamports = feeAmount * 1e9; 

    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: payer.publicKey, 
            toPubkey: treasuryPubkey, 
            lamports: Math.round(lamports), 
        }), 
    ); 

    const signed = await payer.signTransaction(transaction); 
    await sendAndConfirmTransaction(connection, signed, []); 

    return {
        remainingSOL: amountSOL - feeAmount, 
        feePaid: feeAmount, 
    }; 
}