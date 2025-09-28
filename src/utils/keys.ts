import { decryptAES, encryptAES } from "./crypto";
import { loadItem, saveItem } from "./dbIndexedDB";

export async function gerarChaves() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, 
    ["encrypt", "decrypt"]
  );
  return keyPair; 
}

export async function salvarChavePrivada(privateKeyBuffer: ArrayBuffer, password: string, conversaId: number) {
  const encrypted = await encryptAES(privateKeyBuffer, password);
  await saveItem("chatDB", "keys", `private_${conversaId}`, encrypted);
}

async function salvarChavePublica(chavePublica: CryptoKey, conversaId: number) {
  const exported = await crypto.subtle.exportKey("spki", chavePublica); // ArrayBuffer
  await saveItem("chatDB", "keys", `public_${conversaId}`, exported);
}

async function carregarChavePrivada(senha: string, conversaId: number) {
  const encrypted = await loadItem("chatDB", "keys", `private_${conversaId}`);
  if (!encrypted) return null;

  const decrypted = await decryptAES(encrypted.cipher, encrypted.iv, encrypted.salt, senha);
  return crypto.subtle.importKey(
    "pkcs8",
    decrypted,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

