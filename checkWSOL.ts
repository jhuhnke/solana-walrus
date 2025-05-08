import { wormhole, Wormhole } from "@wormhole-foundation/sdk";
import sui from "@wormhole-foundation/sdk/sui";

async function getWSOLAddressOnSui(network: "Mainnet" | "Testnet") {
	const wh = await wormhole(network, [sui]);
	const suiChain = wh.getChain("Sui");

	// Wormhole does NOT expose `getTokens`, only individual lookups
	const token = suiChain.getToken("WSOL");

	if (!token) {
		throw new Error("WSOL not found on Sui");
	}

	console.log(`WSOL Address on Sui ${network}: ${token.address}`);
	return token.address;
}

getWSOLAddressOnSui("Testnet").catch(console.error);
