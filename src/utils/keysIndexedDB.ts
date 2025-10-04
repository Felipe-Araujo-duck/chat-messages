import { encryptAES, decryptAES } from "./crypto";
import { saveItem, loadItem, removeItem } from "./dbIndexedDB";

const DB_NAME = "chatDB";
const STORE_NAME = "keys";

export async function salvarChavePrivada(conversaId: string, privateKey: ArrayBuffer, password: string, expiresAt: number) {
  const encrypted = await encryptAES(privateKey, password);
  const payload = { 
    encrypted, 
    expiresAt,
    algorithm: "RSA-OAEP" 
  };
  await saveItem(DB_NAME, STORE_NAME, `chat_key_${conversaId}`, payload);
}

export async function recuperarChavePrivada(conversaId: string, password: string): Promise<CryptoKey | null> {
  const stored = await loadItem(DB_NAME, STORE_NAME, `chat_key_${conversaId}`);
  if (!stored) return null;
  
  if (Date.now() > stored.expiresAt) {
    await removeItem(DB_NAME, STORE_NAME, `chat_key_${conversaId}`);
    return null;
  }
  
  try {
    const { cipher, iv, salt } = stored.encrypted;
    const decrypted = await decryptAES(cipher, iv, salt, password);
    
    return await crypto.subtle.importKey(
      "pkcs8", 
      decrypted, 
      { 
        name: "RSA-OAEP", 
        hash: "SHA-256" 
      }, 
      true, 
      ["decrypt"]
    );
  } catch (error) {
    console.error('Erro ao recuperar chave privada:', error);
    return null;
  }
}

export async function removerChavePrivada(conversaId: string) {
  await removeItem(DB_NAME, STORE_NAME, `chat_key_${conversaId}`);
}