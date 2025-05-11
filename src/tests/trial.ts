import { wormhole, amount, Wormhole } from '@wormhole-foundation/sdk';
import solana from '@wormhole-foundation/sdk/solana';
import sui from '@wormhole-foundation/sdk/sui';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import fs from 'fs';
import dotenv from 'dotenv';
import bs58 from 'bs58';
import { PublicKey, Connection, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createApproveInstruction, createSyncNativeInstruction } from '@solana/spl-token';
dotenv.config();

(async function () {
  try {
    // Initialize Wormhole SDK for Testnet
    const wh = await wormhole('Testnet', [solana, sui]);

    // Get Solana and SUI chain contexts
    const solanaChain = wh.getChain('Solana');
    const suiChain = wh.getChain('Sui');

    // Load Solana wallet from keypair.json
    const solanaKeypairBytes = new Uint8Array(JSON.parse(fs.readFileSync('./test-wallet.json', 'utf8')));
    const solanaKeypair = Keypair.fromSecretKey(solanaKeypairBytes);
    const solanaAddress = solanaKeypair.publicKey;
    console.log('Solana Wallet:', solanaAddress.toBase58());

    // Initialize Solana connection (Force Devnet for consistency)
    const connection = new Connection('https://api.devnet.solana.com', {
      commitment: 'confirmed'
    });

    // Wrap SOL into wSOL if needed
    const wSolMint = new PublicKey('So11111111111111111111111111111111111111112');
    const wSolTokenAccount = await getAssociatedTokenAddress(wSolMint, solanaAddress, true);

    // Ensure the token account exists
    const accountInfo = await connection.getParsedAccountInfo(wSolTokenAccount);
    if (!accountInfo.value) {
      console.log('Creating wSOL token account...');
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          solanaAddress, // Payer
          wSolTokenAccount, // Token account
          solanaAddress, // Owner
          wSolMint
        )
      );
      const signature = await connection.sendTransaction(transaction, [solanaKeypair]);
      console.log('Created wSOL token account. TXID:', signature);
      await connection.confirmTransaction(signature, 'confirmed');
    }

    // Check and wrap SOL if needed
    const balanceInfo = await connection.getTokenAccountBalance(wSolTokenAccount);
    const wSolBalance = balanceInfo.value.uiAmount || 0;
    if (wSolBalance === 0) {
      console.log('Wrapping 0.01 SOL into wSOL...');
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: solanaAddress,
          toPubkey: wSolTokenAccount,
          lamports: 10000000, // 0.01 SOL
        }),
        createSyncNativeInstruction(wSolTokenAccount) // Sync the wSOL account
      );
      const signature = await connection.sendTransaction(transaction, [solanaKeypair]);
      console.log('Wrapped 0.01 SOL into wSOL. TXID:', signature);
      await connection.confirmTransaction(signature, 'confirmed');
    } else {
      console.log('wSOL account already exists with balance:', wSolBalance);
    }

    // Approve wSOL for transfer
    const transferAmount = BigInt(10000000); // 0.01 SOL in lamports (10^7 microSOL)
    const tokenBridgeAddress = new PublicKey('Bridge1nsectFXkN3RTmjkFvJ8AXvCbQdK8sn8s4hxTM');
    const approveInstruction = createApproveInstruction(
      wSolTokenAccount,
      tokenBridgeAddress, // Set the correct spender
      solanaAddress,
      transferAmount,
      [],
      TOKEN_PROGRAM_ID
    );
    const approveTransaction = new Transaction().add(approveInstruction);
    const approveSignature = await connection.sendTransaction(approveTransaction, [solanaKeypair]);
    console.log('Approved wSOL for transfer. TXID:', approveSignature);
    await connection.confirmTransaction(approveSignature, 'confirmed');

    // Load or generate SUI mnemonic from sui-wallet.json
    let suiMnemonic;
    const suiWalletPath = './sui-wallet.json';
    if (fs.existsSync(suiWalletPath)) {
      const suiWalletData = fs.readFileSync(suiWalletPath, 'utf8').trim();
      if (suiWalletData) {
        const suiWallet = JSON.parse(suiWalletData);
        suiMnemonic = suiWallet.mnemonic;
        console.log('Loaded SUI Mnemonic from sui-wallet.json');
      } else {
        throw new Error('sui-wallet.json is empty');
      }
    } else {
      suiMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      fs.writeFileSync(suiWalletPath, JSON.stringify({ mnemonic: suiMnemonic }, null, 2));
      console.log('Generated new SUI Mnemonic and saved to sui-wallet.json');
    }

    // Generate the keypair from the mnemonic
    const suiKeypair = Ed25519Keypair.deriveKeypair(suiMnemonic);
    const suiAddress = suiKeypair.getPublicKey().toSuiAddress();
    console.log('Generated SUI Wallet:', suiAddress);

    // Create Sui Signer for Wormhole
    const suiSigner = await (await sui()).getSigner(await suiChain.getRpc(), suiMnemonic);
    console.log('Initialized SUI Signer for Wormhole. Address:', suiSigner.address());

    // Suppose solanaKeypair is a Keypair object
    const solanaPrivateKeyBase58 = bs58.encode(solanaKeypair.secretKey);
    const solanaSigner = await (await solana()).getSigner(await solanaChain.getRpc(), solanaPrivateKeyBase58);
    console.log('Initialized Solana Signer for Wormhole. Address:', solanaSigner.address());

    // Set the token ID (wSOL on SUI)
    const tokenId = Wormhole.tokenId('Solana', 'So11111111111111111111111111111111111111112');

    // Perform the token transfer
    console.log('Initiating transfer...');
    const xfer = await wh.tokenTransfer(
      tokenId,
      transferAmount,
      Wormhole.chainAddress('Solana', solanaAddress.toBase58()),
      Wormhole.chainAddress('Sui', suiAddress),
      false
    );

    const srcTxids = await xfer.initiateTransfer(solanaSigner);
    console.log('Started transfer on Solana. TXIDs:', srcTxids);

    console.log('Waiting for attestation...');
    await xfer.fetchAttestation();

    console.log('Attestation received. Completing transfer...');
    const tx = await xfer.completeTransfer(suiSigner);
    console.log('Transfer completed successfully. Transaction ID:', tx);

  } catch (error) {
    console.error('Error during transfer:', error);
  }
})();
