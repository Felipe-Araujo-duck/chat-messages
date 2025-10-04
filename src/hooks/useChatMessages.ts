import { useState, useCallback, useEffect } from 'react';
import { loadItem, saveItem } from '../utils/dbIndexedDB';
import { encryptRSA, decryptRSA, importPublicKey } from '../utils/crypto/rsa';

export interface Conversa {
  id: number;
  nome: string;
}

export interface Message {
  id: number;
  sender: "user" | "other";
  encrypted: ArrayBuffer;
  publicKey: ArrayBuffer; // Chave pública de quem enviou
  timestamp: number;
}

export function useChatMessages(conversaId: number | null, myPrivateKey: CryptoKey | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMessages([]);
    setLoading(false);
  }, [conversaId]);

  // Carregar mensagens do IndexedDB
  const loadMessages = useCallback(async () => {
    if (!conversaId) return;

    setLoading(true);
    try {
      const historico: Message[] = await loadItem("chatDB", "messages", `chat_${conversaId}`) || [];

      setMessages(historico);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversaId]);

  const saveMessagesToDB = useCallback(async (msgs: Message[]) => {
    if (!conversaId) return;

    try {
      await saveItem("chatDB", "messages", `chat_${conversaId}`, msgs);
    } catch (error) {
      console.error('Erro ao salvar mensagens:', error);
    }
  }, [conversaId]);

  const addMessage = useCallback(async (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now(),
      timestamp: Date.now(),
    };

    setMessages(prev => {
      const newMessages = [...prev, newMessage];
      saveMessagesToDB(newMessages); 
      return newMessages;
    });

    return newMessage;
  }, [saveMessagesToDB]);

  // Decifrar mensagem
  const decryptMessage = useCallback(async (message: Message): Promise<string> => {
    if (!myPrivateKey) {
      throw new Error('Chave privada não disponível para decifrar');
    }

    try {
      const decrypted = await decryptRSA(myPrivateKey, message.encrypted);
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Erro ao decifrar mensagem:', error);
      throw new Error('Falha ao decifrar mensagem');
    }
  }, [myPrivateKey]);

  // Cifrar mensagem 
  const encryptMessage = useCallback(async (text: string, publicKeyBuffer: ArrayBuffer): Promise<ArrayBuffer> => {
    const publicKey = await importPublicKey(publicKeyBuffer);
    const data = new TextEncoder().encode(text);

    // Converter Uint8Array para ArrayBuffer
    const arrayBuffer = data.buffer;

    return await encryptRSA(publicKey, arrayBuffer);
  }, []);

  // Limpar mensagens
  const clearMessages = useCallback(() => {
    setMessages([]);
    if (conversaId) {
      saveItem("chatDB", "messages", `chat_${conversaId}`, []);
    }
  }, [conversaId]);

  return {
    messages,
    loading,
    loadMessages,
    addMessage,
    decryptMessage,
    encryptMessage,
    clearMessages,
    setMessages,
  };
}