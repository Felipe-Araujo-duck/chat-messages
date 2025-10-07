import { MdBlock, MdHourglassEmpty, MdLock, MdPersonAdd, MdSend, MdWavingHand } from "react-icons/md";
import Button from "../../components/Button/Button";

import { useEffect, useState } from "react";
import { getPublicKeys, joinChat, notifyUpdatedKeys, onNotificationAccepted, onNotifyRefused, onNotifyUpdatedKeys, onReceiveMessage, registerPublicKey, sendMessage, getConnection } from "../../api/signalR";
import { decryptRSA, encryptRSA, exportPrivateKey, exportPublicKey, importPublicKey } from "../../utils/crypto/rsa";
import { recuperarChavePrivada, removerChavePrivada, salvarChavePrivada } from "../../utils/keysIndexedDB";
import { loadItem } from "../../utils/dbIndexedDB";
import * as signalR from "@microsoft/signalr";
import type { Conversa } from "./Chat";

interface ChatAreaProps {
  userId?: number;
  userName?: string;
  selectedConversa: Conversa | null;
}

export default function ChatArea({ userId, userName, selectedConversa }: ChatAreaProps) {
  const [conversa, setConversa] = useState<Conversa | null>(selectedConversa);
  //const [myPublicKey, setMyPublicKey] = useState<ArrayBuffer | null>(null);
  const [otherPublicKey, setOtherPublicKey] = useState<ArrayBuffer | null>(null);
  //const [myPrivateKey, setMyPrivateKey] = useState<CryptoKey | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  // Atualiza conversa quando mudar
  useEffect(() => {
    if (!conversa?.chatId || selectedConversa?.otherUserId !== conversa.otherUserId) {
      setConversa(selectedConversa);
    }
  }, [conversa, selectedConversa]);

  // Configuração de handlers do SignalR
  useEffect(() => {
    const connection = getConnection();

    const setupHandlers = async () => {
      if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const acceptedHandler = () => {
        setConversa(prev => prev ? { ...prev, statusChat: "Active", accepted: true } : prev);
      };

      const refusedHandler = () => {
        setConversa(prev => prev ? { ...prev, statusChat: "Blocked", accepted: false } : prev);
      };

      const updatedKeys = async () => {
        if (conversa?.chatId) {
          await getKeys(conversa.chatId);
        }
      };

      const messageHandler = async (senderUserId: string, encryptedMessage: string) => {
        if (!senderUserId || !encryptedMessage || !conversa?.chatId) return;
        if (conversa.otherUserId !== parseInt(senderUserId)) return;

        try {
          const keysResult = await getKeys(conversa.chatId);
          const privateKey = keysResult.privateKey;
          if (!privateKey) return;

          const decryptedArray = await decryptRSA(privateKey, base64ToArrayBuffer(encryptedMessage));
          const decryptedText = new TextDecoder().decode(decryptedArray);

          setMessages(prev => [...prev, {
            id: Date.now(),
            sender: "other",
            text: decryptedText
          }]);
        } catch (error) {
          console.error("Erro ao descriptografar mensagem:", error);
        }
      };

      onNotificationAccepted(acceptedHandler);
      onNotifyRefused(refusedHandler);
      onNotifyUpdatedKeys(updatedKeys);
      onReceiveMessage(messageHandler);
    };

    setupHandlers();

    return () => {
      connection?.off("NotificationAccepted");
      connection?.off("NotificationRefused");
      connection?.off("NotifyUpdatedKeys");
      connection?.off("ReceiveMessage");
    };
  }, [conversa?.chatId, conversa?.otherUserId]);

  // Utils
  function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async function getKeys(chatId: number) {
    const keys = await getPublicKeys(chatId);
    const privateKey = await recuperarChavePrivada(chatId.toString(), "tokenFake");

    //setMyPublicKey(base64ToArrayBuffer(keys.userPublicKey));
    setOtherPublicKey(base64ToArrayBuffer(keys.otherUserPublicKey));
    //setMyPrivateKey(privateKey);

    return { ...keys, privateKey };
  }

  async function renovaChaves(chatId: number) {
    const existingKey = await loadItem("chatDB", "keys", `chat_key_${chatId}`);

    if (!existingKey || existingKey.expiresAt < Date.now()) {
      await geradorDeChaves(chatId);
      if (conversa?.statusChat === "Active") {
        await notifyUpdatedKeys(chatId);
      }
      return await getKeys(chatId);
    } else {
      return await getKeys(chatId);
    }
  }

  async function gerarChaves() {
    return await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  async function geradorDeChaves(chatId: number) {
    await removerChavePrivada(chatId.toString())
    const keyPair = await gerarChaves();
    const publicKeyBuffer = await exportPublicKey(keyPair.publicKey);
    const privateKeyBuffer = await exportPrivateKey(keyPair.privateKey);

    const expiresAt = Date.now() + 1000 * 60 * 2; // 2 minutos
    await salvarChavePrivada(chatId.toString(), privateKeyBuffer, "tokenFake", expiresAt);

    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
    await registerPublicKey(publicKeyBase64, chatId);

    //setMyPublicKey(publicKeyBuffer);
    //setMyPrivateKey(keyPair.privateKey);
  }

  // Convite
  const enviarConvite = async () => {
    try {
      const convite = await joinChat(userId!, conversa?.otherUserId ?? 0, conversa?.chatId, true);
      setConversa({
        chatId: convite.id,
        statusChat: convite.status,
        accepted: false,
        otherUserId: conversa?.otherUserId || 0,
        otherUserName: conversa?.otherUserName || "",
      });
      await geradorDeChaves(convite.id);
    } catch {
      console.log("Erro ao enviar convite");
    }
  };

  const recusarConvite = async () => {
    try {
      const convite = await joinChat(userId!, conversa?.otherUserId ?? 0, conversa?.chatId, false);
      setConversa({
        chatId: convite.id,
        statusChat: convite.status,
        accepted: false,
        otherUserId: conversa?.otherUserId || 0,
        otherUserName: conversa?.otherUserName || "",
      });
    } catch {
      console.log("Erro ao recusar convite");
    }
  };

  // Envio de mensagem
  const handleSend = async () => {
    if (sending || !newMessage.trim() || !conversa?.chatId) return;
    setSending(true);

    try {
      const keys = await renovaChaves(conversa.chatId);
      const publicKeyToUse = otherPublicKey || base64ToArrayBuffer(keys.otherUserPublicKey);
      const pubKey = await importPublicKey(publicKeyToUse);

      const data = new TextEncoder().encode(newMessage);
      const encrypted = await encryptRSA(pubKey, data.buffer);
      const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));

      await sendMessage(conversa.chatId, encryptedBase64);

      setMessages(prev => [...prev, { id: Date.now(), sender: "user", text: newMessage }]);
      setNewMessage("");
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- Renderizações
  if (!conversa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
          <MdWavingHand className="text-3xl text-500" />
          Olá {userName}
        </h2>
        <p className="text-lg">Selecione uma conversa na lista para começar</p>
      </div>
    );
  }

  if (!conversa.chatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500 p-4">
        <h2 className="text-2xl font-semibold text-center">Iniciar conversa com {conversa.otherUserName}</h2>
        <Button className="px-6 py-2" onClick={enviarConvite}>
          Enviar Convite
        </Button>
      </div>
    );
  }

  if (conversa.statusChat == "Pending" && !conversa.accepted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500 p-4">
        <h2 className="text-2xl font-semibold text-center flex items-center justify-center gap-2">
          <MdHourglassEmpty className="text-2xl animate-spin" />
          Aguardando {conversa.otherUserName} aceitar o convite...
        </h2>
        <p className="text-sm text-center">As chaves de criptografia foram geradas, aguardando a outra parte...</p>
      </div>
    );
  }

  if (conversa.statusChat == "Pending" && conversa.accepted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-gray-600 p-6">
        <h2 className="text-2xl font-semibold text-center flex items-center justify-center gap-2">
          <MdPersonAdd className="text-3xl text-blue-500" />
          {conversa.otherUserName} convidou você para conversar
        </h2>
        <p className="text-sm text-center text-gray-500 max-w-md">
          Para iniciar o chat, você precisa aceitar o convite. As chaves de criptografia serão compartilhadas automaticamente após a confirmação.
        </p>
        <div className="flex gap-4 mt-4">
          <button onClick={enviarConvite} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition">
            Aceitar
          </button>
          <button onClick={recusarConvite} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg shadow-md transition">
            Recusar
          </button>
        </div>
      </div>
    );
  }

  if (conversa.statusChat === "Blocked") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-yellow-50 p-8 rounded-2xl">
        <div className="text-center">
          <MdBlock className="text-6xl text-yellow-600 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold text-yellow-600 mb-2">Chat Bloqueado</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="bg-primary text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-lg">{selectedConversa?.otherUserName}</h1>
          <p className="text-sm opacity-80 flex items-center gap-1">
            <MdLock className="text-base" />
            Criptografia de ponta a ponta ativa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm bg-green-500 px-2 py-1 rounded">Seguro</span>
        </div>
      </header>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg max-w-xs shadow ${
              msg.sender === "user" ? "bg-blue-500 text-white self-end" : "bg-white self-start"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2 w-full">
          <input
            type="text"
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={sending}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow duration-200 disabled:opacity-50"
          />
          <Button type="button" onClick={handleSend} disabled={sending || !newMessage.trim()} className="px-4 py-2">
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <MdSend size={20} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
