import { wormhole } from "@wormhole-foundation/sdk";
import sui from "@wormhole-foundation/sdk/sui"; 

export async function getSuiSigner(mnemonic: string) {
  const suiChain = await (await wormhole("Testnet", [sui])).getChain("Sui");
  const suiSigner =  await (await sui()).getSigner(await suiChain.getRpc(), mnemonic);
  
  return {
    addr: suiSigner,
    signer: suiSigner,
  };
}
