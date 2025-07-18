import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

// 🔁 Replace this with the actual WSOL type on SUI (e.g., from Aftermath or Wormhole bridge)
const WSOL_TYPE = "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN"; // <-- Replace this
const TEST_ADDRESS = "0xd30b927219db50020e5c4d893e2af744792381c9a1e335511ae011da6c5dba98"; // Replace with any SUI address that may have WSOL

async function main() {
	const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

	try {
		const coins = await client.getCoins({ owner: TEST_ADDRESS, coinType: WSOL_TYPE });

		if (coins.data.length === 0) {
			console.log(`[❌] No WSOL found for address ${TEST_ADDRESS}`);
		} else {
			const total = coins.data.reduce((acc, c) => acc + BigInt(c.balance), 0n);
			console.log(`[✅] Total WSOL Balance: ${total} (raw), ${Number(total) / 1e9} WSOL`);
		}
	} catch (e) {
		console.error(`[❌] Error fetching WSOL balance:`, e);
	}
}

main();
