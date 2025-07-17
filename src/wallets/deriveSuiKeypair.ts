import { WebCryptoSigner } from "@mysten/signers/webcrypto";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// === HARD-CODED FAUCET CONFIG ===
const FAUCET_URL = "http://localhost:3001";
const FAUCET_API_KEY = "cfd84c8b556bac2cd5f53be2d6691784d08361c81264cebeb3a01de4f1693c72";
const FAUCET_AMOUNT = "0.005"; 

// === PATH TO LOCAL SIGNER FILE ===
const KEY_PATH = path.resolve(__dirname, "./sui-webcrypto-key.json");

// === SUI CLIENT SETUP ===
const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

interface ExportedWebCryptoKeypair {
  privateKey: JsonWebKey;
  publicKey: number[];
}

async function fundFromFaucet(address: string) {
  console.log(`[🚰] Requesting ${FAUCET_AMOUNT} SUI for ${address} from faucet...`);

  const res = await fetch(`${FAUCET_URL}/fund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${FAUCET_API_KEY}`,
    },
    body: JSON.stringify({ address, amount: FAUCET_AMOUNT }),
  });

  const result = await res.json() as { error?: string; txDigest?: string };
  if (!res.ok) {
    console.error("[❌] Faucet error:", result.error);
    throw new Error(`Faucet failed: ${result.error}`);
  }

  console.log(`[✅] Faucet funded address ${address} (txDigest: ${result.txDigest})`);
}

export async function getWebCryptoSigner(): Promise<{
  signer: WebCryptoSigner;
  addr: string;
}> {
  let signer: WebCryptoSigner;

  const saveKey = async (signer: WebCryptoSigner) => {
    const exported = await signer.export();
    const jsonToSave = JSON.stringify({
      privateKey: exported.privateKey,
      publicKey: Array.from(exported.publicKey),
    });
    fs.writeFileSync(KEY_PATH, jsonToSave);
    console.log("[✅] Signer saved to disk.");
  };

  if (fs.existsSync(KEY_PATH)) {
    try {
      console.log("[🔑] Loading existing key...");

      const exportedJson = fs.readFileSync(KEY_PATH, "utf8");
      const exported: ExportedWebCryptoKeypair = JSON.parse(exportedJson);

      const privateKey = await crypto.subtle.importKey(
        "jwk",
        exported.privateKey,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
      );

      signer = await WebCryptoSigner.import({
        privateKey,
        publicKey: new Uint8Array(exported.publicKey),
      });

      console.log("[✅] Successfully loaded signer from disk.");
    } catch (e: any) {
      console.warn("[❌] Failed to import key. Regenerating...");
      fs.unlinkSync(KEY_PATH);

      signer = await WebCryptoSigner.generate({ extractable: true });
      await saveKey(signer);
    }
  } else {
    console.log("[🔐] No key found. Generating...");
    signer = await WebCryptoSigner.generate({ extractable: true });
    await saveKey(signer);
  }

  const addr = signer.getPublicKey().toSuiAddress();

  try {
    const coins = await client.getCoins({ owner: addr });
    const total = coins.data.reduce((sum, c) => sum + Number(c.balance), 0);
    const balanceSUI = total / 1e9;

    console.log(`[💰] SUI balance for ${addr}: ${balanceSUI.toFixed(4)} SUI`);

    if (total === 0) {
      await fundFromFaucet(addr);
    }
  } catch (err: any) {
    console.error("[⚠️] Failed to fetch balance:", err.message);
  }

  return { signer, addr };
}
