// hooks/useChatKeys.ts
import { useState, useCallback, useEffect } from 'react';
import { loadItem, saveItem } from '../utils/dbIndexedDB';
import { salvarChavePrivada, recuperarChavePrivada } from '../utils/keysIndexedDB';
import { gerarChaves } from '../utils/keys';
import { exportPrivateKey, exportPublicKey } from '../utils/crypto/rsa';
import { registerPublicKey } from '../api/signalR';

export function useChatKeys(conversaId: number | null) {
  const [myPrivateKey, setMyPrivateKey] = useState<CryptoKey | null>(null);
  const [myPublicKey, setMyPublicKey] = useState<ArrayBuffer | null>(null);
  const [otherPublicKey, setOtherPublicKey] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    
    // Limpar estado quando a conversa mudar
    setMyPrivateKey(null);
    setMyPublicKey(null);
    setOtherPublicKey(null);
    setLoading(false);
  }, [conversaId]); 

  const loadKeys = useCallback(async () => {
    if (!conversaId) return;

    setLoading(true);
    try {
      
      // Carregar minhas chaves
      const myPrivKey = await recuperarChavePrivada(conversaId.toString(), "tokenFake");
      const myPubBuffer = await loadItem("chatDB", "keys", `public_my_${conversaId}`);
      
      if (myPrivKey && myPubBuffer) {
        setMyPrivateKey(myPrivKey);
        setMyPublicKey(myPubBuffer);
      } else {
        console.log(`Nenhuma chave encontrada para conversa ${conversaId}`);
      }

      // Carregar chave pública do outro
      const otherPubBuffer = await loadItem("chatDB", "keys", `public_other_${conversaId}`);
      if (otherPubBuffer) {
        setOtherPublicKey(otherPubBuffer);
      }
    } catch (error) {
      console.error(`Erro ao carregar chaves para conversa ${conversaId}:`, error);
    } finally {
      setLoading(false);
    }
  }, [conversaId]);

  const generateMyKeys = useCallback(async () => {
    if (!conversaId) return;

    try {      
      
      const keyPair = await gerarChaves();
      const privateKeyBuffer = await exportPrivateKey(keyPair.privateKey);
      const publicKeyBuffer = await exportPublicKey(keyPair.publicKey);

      const publicKeyBase64 = btoa(
        String.fromCharCode(...new Uint8Array(publicKeyBuffer))
      );

      await registerPublicKey(publicKeyBase64, conversaId);

      // Salvar chaves
      const expiresAt = Date.now() + 1000 * 60 * 2; // 2 minutos
      await salvarChavePrivada(conversaId.toString(), privateKeyBuffer, "tokenFake", expiresAt);
      await saveItem("chatDB", "keys", `public_my_${conversaId}`, publicKeyBuffer);

      setMyPrivateKey(keyPair.privateKey);
      setMyPublicKey(publicKeyBuffer);
      
      return publicKeyBuffer;
    } catch (error) {
      console.error(`Erro ao gerar chaves para conversa ${conversaId}:`, error);
      throw error;
    }
  }, [conversaId]);

  const setOtherUserPublicKey = useCallback(async (publicKeyBuffer: ArrayBuffer) => {
    if (!conversaId) return;

    await saveItem("chatDB", "keys", `public_other_${conversaId}`, publicKeyBuffer);
    setOtherPublicKey(publicKeyBuffer);
  }, [conversaId]);

  const clearKeys = useCallback(() => {
    setMyPrivateKey(null);
    setMyPublicKey(null);
    setOtherPublicKey(null);
  }, []);

  function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

  return {
    myPrivateKey,
    myPublicKey,
    otherPublicKey,
    loading,
    loadKeys,
    generateMyKeys,
    setOtherUserPublicKey,
    clearKeys,
  };
}