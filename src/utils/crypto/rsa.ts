export async function encryptRSA(publicKey: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
  return await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    data
  );
}

export async function decryptRSA(privateKey: CryptoKey, encryptedData: ArrayBuffer): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    encryptedData
  );
}

export async function importPublicKey(publicKeyBuffer: ArrayBuffer): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<ArrayBuffer> {
  return await crypto.subtle.exportKey("spki", publicKey);
}

export async function exportPrivateKey(privateKey: CryptoKey): Promise<ArrayBuffer> {
  return await crypto.subtle.exportKey("pkcs8", privateKey);
}