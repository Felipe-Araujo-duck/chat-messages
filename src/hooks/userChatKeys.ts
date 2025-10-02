import { useEffect, useState } from "react";
import { gerarChaves } from "../utils/keys";
import { recuperarChavePrivada, salvarChavePrivada } from "../utils/keysIndexedDB";

export function useChatKeys(conversaId: string, password: string, tokenExpiresAt: number) {
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [publicKey, setPublicKey] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    if (!conversaId) return;

    async function init() {
      // Tenta recuperar chave privada do IndexedDB
      const recovered = await recuperarChavePrivada(conversaId, password);
      if (recovered) {
        setPrivateKey(recovered);

        const exportedPub = await crypto.subtle.exportKey(
          "spki",
          await crypto.subtle.deriveKey(
            { name: "ECDH", public: recovered },
            recovered,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
          )
        );
        setPublicKey(exportedPub);
      } else {
        // 2. Se não existir, gera par novo
        const pair = await gerarChaves();

        const exportedPrivate = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
        const exportedPublic = await crypto.subtle.exportKey("spki", pair.publicKey);

        await salvarChavePrivada(conversaId, exportedPrivate, password, tokenExpiresAt);

        setPrivateKey(pair.privateKey);
        setPublicKey(exportedPublic);
      }
    }

    init();
  }, [conversaId, password, tokenExpiresAt]);

  return { privateKey, publicKey };
}
