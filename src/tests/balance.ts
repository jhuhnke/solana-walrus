import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

// Replace with the SUI RPC endpoint you want to use
const RPC_ENDPOINT = 'https://fullnode.testnet.sui.io:443';

// Replace with the SUI address you want to check
const SUI_ADDRESS = '0x8e0a2135568a5ff202aa0b78a7f3113fc8b68b65d4b5143261f723cc445d9809';

async function fetchBalance(address: string) {
    try {
        const rpcUrl = getFullnodeUrl('testnet'); 
        console.log(rpcUrl); 
        const provider = new SuiClient({ url: rpcUrl})
        console.log(provider)
        const balances = await provider.getCoins({
            owner: address,
        });

        console.log(`Balance for ${address}:`, balances);
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}

fetchBalance(SUI_ADDRESS);