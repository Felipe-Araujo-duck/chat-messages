export async function deriveKey(password: string, salt: Uint8Array) {
  const pwKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const saltCorrect = new Uint8Array(salt);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltCorrect,
      iterations: 200_000,
      hash: "SHA-256",
    },
    pwKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}


export async function encryptAES(data: ArrayBuffer, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { cipher, iv, salt };
}

export async function decryptAES(cipher: ArrayBuffer, iv: ArrayBuffer, salt: ArrayBuffer, password: string) {
  const key = await deriveKey(password, new Uint8Array(salt));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, cipher);
  return decrypted;
}

