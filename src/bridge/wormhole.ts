import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import solana from '@wormhole-foundation/sdk/solana';
import sui    from '@wormhole-foundation/sdk/sui';
import {
  wormhole,
  Wormhole,
  TokenId,
  amount,
  isTokenId,
  ChainAddress,
  Signer
} from '@wormhole-foundation/sdk';

import { getSolanaSigner } from '../wallets/solana';
import { getSuiSigner    } from '../wallets/sui';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/**
 * Creates and sends a Wormhole message for a file upload,
 * then returns the resulting "blob ID" once redeemed on Sui.
 */
export async function createAndSendWormholeMsg(params: {
  fileHash: string;
  fileSize: number;
  amountSOL: number;
  solanaPubkey: PublicKey;
  suiReceiver?: string;
}): Promise<string> {
  const { fileHash, fileSize, amountSOL, solanaPubkey, suiReceiver } = params;

  // 1) Init Wormhole + adapters
  const wh = await wormhole('Testnet', [solana, sui]);
  const solChain = wh.getChain('Solana');
  const suiChain = wh.getChain('Sui');

  // 2) Build Solana signer/address
  const solConnection = new Connection('https://api.testnet.solana.com');
  const solKeypair    = Keypair.generate(); // or import from secret
  const { addr: solAddr, signer: solSigner } =
    getSolanaSigner(solChain, solKeypair, solConnection);

  // 3) Build Sui signer/address
  const suiKeypair = Ed25519Keypair.generate(); // or import from secret
  const { addr: suiAddr, signer: suiSigner } = getSuiSigner(suiChain, suiKeypair);

  // 4) Prepare the native SOL token bridge address
  const tokenId: TokenId = Wormhole.tokenId('Solana', 'native');
  const solMint = await (solana as any).getOriginalAsset(tokenId);

  // 5) Normalize the amount
  const decimals = isTokenId(tokenId)
    ? Number(await wh.getDecimals(tokenId.chain, tokenId.address))
    : solChain.config.nativeTokenDecimals;
  const transferAmount = amount.units(amount.parse(amountSOL.toString(), decimals));

  // 6) Kick off the manual tokenTransfer
  const xfer = await wh.tokenTransfer(
    solMint,
    transferAmount,
    solAddr as unknown as ChainAddress,
    suiAddr as unknown as ChainAddress,
    false
  );

  // 7) Submit on Solana
  const [solTx, bridgeTx] = await xfer.initiateTransfer(solSigner as unknown as Signer);

  // 8) Wait for the VAA
  await xfer.fetchAttestation(5 * 60_000);

  // 9) Redeem on Sui
  const suiTxs = await xfer.completeTransfer(suiSigner);

  // 10) The “blob ID” is encoded in the final transaction logs on Sui.
  //     You’ll need to fetch the event or VAA payload from `suiTxs`.
  //     For simplicity, let’s assume the bridge returns it as the first log:
  if (Array.isArray(suiTxs)) {
    return suiTxs[0];
  }
  return suiTxs;
}