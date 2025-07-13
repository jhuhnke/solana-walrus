import { wormhole } from "@wormhole-foundation/sdk";
import sui from "@wormhole-foundation/sdk/sui";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getSDKConfig } from "../config"; // adjust path as needed

type Input = string | Ed25519Keypair;

export async function getSuiSigner(input: Input) {
	const config = getSDKConfig();

	const sdk = await wormhole(
		config.network === "mainnet" ? "Mainnet" : "Testnet",
		[sui],
		{
			chains: {
				Sui: {
					rpc: config.suiUrl || "https://fullnode.mainnet.sui.io:443",
					contracts: {
						coreBridge: config.tokenAddresses[config.network].coreBridge,
						tokenBridge: config.tokenAddresses[config.network].tokenBridge,
					},
				},
			},
		}
	);

	const suiChain = sdk.getChain("Sui");

	let suiSigner: Ed25519Keypair;
	if (typeof input === "string") {
		const signer = await (await sui()).getSigner(await suiChain.getRpc(), input);
		if (!(signer instanceof Ed25519Keypair)) {
			throw new Error("Signer is not an Ed25519Keypair");
		}
		suiSigner = signer;
	} else {
		suiSigner = input;
	}

	return {
		addr: suiSigner.getPublicKey().toSuiAddress(),
		signer: suiSigner,
	};
}
