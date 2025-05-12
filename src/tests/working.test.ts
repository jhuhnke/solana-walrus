import fetch from "cross-fetch";

// Polyfill fetch for Node.js
globalThis.fetch = fetch;

const SUI_ADDRESS = '0x8e0a2135568a5ff202aa0b78a7f3113fc8b68b65d4b5143261f723cc445d9809';
const RPC_URL = 'https://fullnode.testnet.sui.io:443';

describe("SUI Wallet Balance Test", () => {
    it("should fetch the balance of the SUI address", async () => {
        try {
            const response = await fetch(RPC_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    method: 'suix_getCoins',
                    params: [SUI_ADDRESS, null, null], // Correct parameter format
                    jsonrpc: '2.0',
                    id: 1,
                }),
            });

            const jsonResponse = await response.json();
            console.log(`[✅] Raw fetch response:`, jsonResponse);

            expect(jsonResponse).toBeDefined();
            expect(jsonResponse.result).toBeDefined();
            console.log("[✅] Balance fetched successfully.");
        } catch (error) {
            console.error("[❌] Test failed:", error);
            throw error;
        }
    }, 150_000); // 10 minute timeout for test (can be long due to testnet latency)
});

