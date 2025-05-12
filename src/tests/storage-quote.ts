import { WalrusClient } from "@mysten/walrus";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import fs from "fs";

// Initialize SuiClient for testnet
const suiClient = new SuiClient({
    url: getFullnodeUrl('testnet'),
    network: 'testnet'
});

// Initialize WalrusClient for testnet
const walrusClient = new WalrusClient({
    network: "testnet",
    suiClient,
    packageConfig: {
        systemObjectId: "0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af",
        stakingPoolId: "0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3",
    },
});

// Read the file as a Uint8Array
const fileBuffer = fs.readFileSync("test.txt");
const blob = new Uint8Array(fileBuffer);

async function main() {
    const epochs = 3;
    console.log(blob.length); 
    console.log(suiClient); 
    console.log(walrusClient); 
    console.log(epochs)
    const quote = await walrusClient.storageCost(blob.length, epochs);
    console.log("Storage cost for test.txt over 3 epochs:");
    console.log(quote);
}

main().catch(console.error);
