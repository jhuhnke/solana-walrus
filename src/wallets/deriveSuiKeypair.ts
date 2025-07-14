import { WebCryptoSigner } from "@mysten/signers/webcrypto";
import fs from "fs";
import path from "path";

const KEY_PATH = path.resolve(__dirname, "./sui-webcrypto-key.json");

interface ExportedWebCryptoKeypair {
  privateKey: JsonWebKey;
  publicKey: number[];
}

/**
 * Load a WebCryptoSigner from disk or create a new one if it doesn't exist.
 */
export async function getWebCryptoSigner(): Promise<{
  signer: WebCryptoSigner;
  addr: string;
}> {
  let signer: WebCryptoSigner;

  if (fs.existsSync(KEY_PATH)) {
    try {
      console.log("[🔑] Existing key file found. Attempting to load...");

      const exportedJson = fs.readFileSync(KEY_PATH, "utf8");
      const exported: ExportedWebCryptoKeypair = JSON.parse(exportedJson);

      const privateKey = await crypto.subtle.importKey(
        "jwk",
        exported.privateKey,
        {
          name: "ECDSA",
          namedCurve: "P-256",
        },
        false,
        ["sign"]
      );

      signer = await WebCryptoSigner.import({
        privateKey,
        publicKey: new Uint8Array(exported.publicKey),
      });

      console.log("[✅] Successfully loaded signer from disk.");
    } catch (e: any) {
      console.warn("[❌] Failed to import WebCryptoSigner from disk. File may be corrupted:", e.message);
      console.warn("[⚠️] Deleting corrupted key file and regenerating...");
      fs.unlinkSync(KEY_PATH);

      signer = await WebCryptoSigner.generate({ extractable: true });
      const exported = await signer.export();

      const jsonToSave = JSON.stringify({
        privateKey: exported.privateKey, // JWK is serializable
        publicKey: Array.from(exported.publicKey),
      });

      fs.writeFileSync(KEY_PATH, jsonToSave);
      console.log("[✅] New signer generated and saved to disk.");
    }
  } else {
    console.log("[🔐] No key file found. Generating new signer...");

    signer = await WebCryptoSigner.generate({ extractable: true });
    const exported = await signer.export();

    const jsonToSave = JSON.stringify({
      privateKey: exported.privateKey,
      publicKey: Array.from(exported.publicKey),
    });

    fs.writeFileSync(KEY_PATH, jsonToSave);
    console.log("[✅] New signer generated and saved to disk.");
  }

  return {
    signer,
    addr: signer.getPublicKey().toSuiAddress(),
  };
}