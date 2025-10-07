import { useState, useCallback, useEffect } from 'react';
import { saveItem } from '../utils/dbIndexedDB';
import { salvarChavePrivada, recuperarChavePrivada } from '../utils/keysIndexedDB';
import { gerarChaves } from '../utils/keys';
import { exportPrivateKey, exportPublicKey } from '../utils/crypto/rsa';
import { getPublicKeys, registerPublicKey } from '../api/signalR';

export function useChatKeys(conversaId: number | null) {
  const [myPrivateKey, setMyPrivateKey] = useState<CryptoKey | null>(null);
  const [myPublicKey, setMyPublicKey] = useState<ArrayBuffer | null>(null);
  const [otherPublicKey, setOtherPublicKey] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMyPrivateKey(null);
    setMyPublicKey(null);
    setOtherPublicKey(null);
    setLoading(false);
  }, [conversaId]); 

  const base64ToArrayBuffer = useCallback((base64: string): ArrayBuffer => {
    try {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error('❌ Erro na conversão base64:', error);
      throw error;
    }
  }, []);

  const loadKeys = useCallback(async () => {
    if (!conversaId) return;

    setLoading(true);
    try {
      const myPrivKey = await recuperarChavePrivada(conversaId.toString(), "tokenFake");
      const publicKeys = await getPublicKeys(conversaId);

      if (myPrivKey && publicKeys) {
        const mypublicKey = base64ToArrayBuffer(publicKeys.userPublicKey)
        const otherpublicKey = base64ToArrayBuffer(publicKeys.otherUserPublicKey)
        
        setMyPrivateKey(myPrivKey);
        setMyPublicKey(mypublicKey);
        setOtherPublicKey(otherpublicKey);
      }

    } catch (error) {
      console.error(`Erro ao carregar chaves para conversa ${conversaId}:`, error);
    } finally {
      setLoading(false);
    }
  }, [conversaId, base64ToArrayBuffer]);

  const generateMyKeys = useCallback(async (chatId: number) => {
    if (!chatId) return;

    try {      
      const keyPair = await gerarChaves();
      const privateKeyBuffer = await exportPrivateKey(keyPair.privateKey);
      const publicKeyBuffer = await exportPublicKey(keyPair.publicKey);

      const publicKeyBase64 = btoa(
        String.fromCharCode(...new Uint8Array(publicKeyBuffer))
      );

      await registerPublicKey(publicKeyBase64, chatId);

      const expiresAt = Date.now() + 1000 * 60 * 2;
      await salvarChavePrivada(chatId.toString(), privateKeyBuffer, "tokenFake", expiresAt);

      setMyPrivateKey(keyPair.privateKey);
      setMyPublicKey(publicKeyBuffer);
      
      return publicKeyBuffer;
    } catch (error) {
      console.error(`Erro ao gerar chaves para conversa ${chatId}:`, error);
      throw error;
    }
  }, []);

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

  const forceReload = useCallback(() => {
    if (conversaId) {
      loadKeys();
    }
  }, [conversaId, loadKeys]);

  return {
    myPrivateKey,
    myPublicKey,
    otherPublicKey,
    loading,
    loadKeys,
    generateMyKeys,
    setOtherUserPublicKey,
    clearKeys,
    forceReload,
  };
}