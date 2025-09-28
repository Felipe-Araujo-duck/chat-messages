import { useEffect, useState } from "react";
import { gerarParChaves } from "../utils/keys";
import { recuperarChavePrivada, salvarChavePrivada } from "../utils/keysIndexedDB";

export function useChatKeys(conversaId: string, password: string, tokenExpiresAt: number) {
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [publicKey, setPublicKey] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    async function init() {
      const recovered = await recuperarChavePrivada(conversaId, password);
      if (recovered) {
        setPrivateKey(recovered);
      } else {
        const pair = await gerarParChaves();
        await salvarChavePrivada(conversaId, pair.privateKey, password, tokenExpiresAt);
        setPrivateKey(await crypto.subtle.importKey("pkcs8", pair.privateKey, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]));
        setPublicKey(pair.publicKey);
      }
    }
    init();
  }, [conversaId, password, tokenExpiresAt]);

  return { privateKey, publicKey };
}
