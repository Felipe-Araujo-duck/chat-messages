import { MdBlock, MdHourglassEmpty, MdLock, MdPersonAdd, MdSend, MdWavingHand } from "react-icons/md";
import Button from "../../components/Button/Button";
import type { Conversa, Message } from "../../hooks/useChatMessages";
import { useCallback, useEffect, useRef, useState } from "react";
import { getPublicKeys, joinChat, onNotificationAccepted, onNotifyRefused, onReceiveMessage, registerPublicKey, sendMessage } from "../../api/signalR";

import { decryptRSA, encryptRSA, exportPrivateKey, exportPublicKey, importPublicKey } from "../../utils/crypto/rsa";
import api from "../../api/api";

interface ChatAreaProps {
  userId?: number;
  userName?: string;
  selectedConversa: Conversa | null;
}


export default function ChatArea({ userId, userName, selectedConversa }: ChatAreaProps) {
  
  const [conversa, setConversa] = useState<Conversa | null>(selectedConversa)
  const [myPublicKey, setMyPublicKey] = useState<ArrayBuffer | null>(null);
  const [otherPublicKey, setOtherPublicKey] = useState<ArrayBuffer | null>(null);
  const [myPrivateKey, setMyPrivateKey] = useState<CryptoKey | null>(null);
  const [newMessage, setNewMessage] = useState("")
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll para baixo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const messageHandler = useCallback(async (senderUserId: string, message: string) => {
    console.log(message)
    if (!myPrivateKey) {
      console.error("Private key não disponível");
      return;
    }

    try {
      const decryptedArray = await decryptRSA(
        myPrivateKey,
        base64ToArrayBuffer(message)
      );
      const decryptedText = new TextDecoder().decode(decryptedArray);

      setMessages(prev => [...prev, { id: Date.now(), sender: "user", text: decryptedText }]);
    } catch (error) {
      console.error(error);
    }
  }, [myPrivateKey]);

  useEffect(() => {
    onReceiveMessage(messageHandler);
  }, [messageHandler]);

  useEffect(() => {
    if(!conversa?.chatId || selectedConversa?.otherUserId != conversa.otherUserId){
      setConversa(selectedConversa)
    }

    const acceptedHandler = () => {
      setConversa({
        chatId: conversa?.chatId || 0,
        statusChat: 'Active',
        accepted: true,
        otherUserId: conversa?.otherUserId || 0,
        otherUserName: conversa?.otherUserName || ''
      })
    };

    const refusedHandler = () => {
      setConversa({
        chatId: conversa?.chatId || 0,
        statusChat: 'Blocked',
        accepted: false,
        otherUserId: conversa?.otherUserId || 0,
        otherUserName: conversa?.otherUserName || ''
      })
    };

   /*  const messageHandler = async (senderUserId: string, message: string) => {
      debugger
      const decryptMessage = async (message: string): Promise<string> => {
        if (!myPrivateKey) {
          throw new Error("Chave privada não disponível para decifrar");
        }

        try {
          const decrypted = await decryptRSA(
            myPrivateKey,
            base64ToArrayBuffer(message)
          );
          return new TextDecoder().decode(decrypted);
        } catch (error) {
          console.error("Erro ao decifrar mensagem:", error);
          throw new Error("Falha ao decifrar mensagem");
        }
      };

      
      debugger
      const menssage: any = {
        id: Date.now(),
        sender: "user",
        text: decryptMessage(message)
      }
      setMessages((prev) => [...prev, menssage]);
      
    }; */

    //onReceiveMessage(messageHandler);
    onNotificationAccepted(acceptedHandler);
    onNotifyRefused(refusedHandler);
    

  });

  function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async function getKeys(chatId: number) {
    try {
      const keys = await getPublicKeys(chatId);
      setMyPublicKey(base64ToArrayBuffer(keys.userPublicKey));
      setOtherPublicKey(base64ToArrayBuffer(keys.otherUserPublicKey))

      return keys;
    } catch (error) {
      console.error("Erro ao buscar chaves:", error);
    }
  }

  async function gerarChaves() {
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

  const enviarConvite = async () => {

    try{
      const convite = await joinChat(userId!, conversa?.otherUserId ?? 0, conversa?.chatId, true);

      setConversa({
        chatId: convite.id,
        statusChat: convite.status,
        accepted: false,
        otherUserId: conversa?.otherUserId || 0,
        otherUserName: conversa?.otherUserName || ''
      })

      const keyPair = await gerarChaves();
      const publicKeyBuffer = await exportPublicKey(keyPair.publicKey);

      const publicKeyBase64 = btoa(
        String.fromCharCode(...new Uint8Array(publicKeyBuffer))
      );

      await registerPublicKey(publicKeyBase64, convite.id);

      setMyPublicKey(publicKeyBuffer)
      setMyPrivateKey(keyPair.privateKey)
      console.log(myPrivateKey)

    } catch (error){
      console.log("Erro ao enviar convite")
    }
  }

  const recusarConvite = async () => {
    try{
      const convite = await joinChat(userId!, conversa?.otherUserId ?? 0, conversa?.chatId, false);
      setConversa({
        chatId: convite.id,
        statusChat: convite.status,
        accepted: false,
        otherUserId: conversa?.otherUserId || 0,
        otherUserName: conversa?.otherUserName || ''
      })

    } catch(error) {
      console.log("Erro ao recusar convite")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {

    await getKeys(conversa?.chatId || 0)

    if (!newMessage.trim() || !otherPublicKey || !myPublicKey) return;

    const encryptMessage = async (
      text: string,
      publicKeyBuffer: ArrayBuffer
    ): Promise<ArrayBuffer> => {
      const publicKey = await importPublicKey(publicKeyBuffer);
      const data = new TextEncoder().encode(text);

      return await encryptRSA(publicKey, data.buffer);
    };


    const encryptedForOther = await encryptMessage(newMessage, otherPublicKey);
    const encryptedForOtherBase64 = btoa(
      String.fromCharCode(...new Uint8Array(encryptedForOther))
    );

    await sendMessage(conversa?.chatId ?? 0, encryptedForOtherBase64);

    const menssage: any = {
      id: Date.now(),
      sender: "user",
      text: newMessage
    }
    setMessages((prev) => [...prev, menssage]);

  }


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

  if(!conversa.chatId){
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500 p-4">
        <h2 className="text-2xl font-semibold text-center">
          Iniciar conversa com {conversa.otherUserName}
        </h2>
        <Button
          className="px-6 py-2"
          onClick={enviarConvite}
        >
          Enviar Convite
        </Button>
      </div>
    );
  }

  if(conversa.statusChat == 'Pending' && !conversa.accepted){
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500 p-4">
        <h2 className="text-2xl font-semibold text-center flex items-center justify-center gap-2">
          <MdHourglassEmpty className="text-2xl animate-spin" />
          Aguardando {conversa.otherUserName} aceitar o convite...
        </h2>
        <p className="text-sm text-center">
          As chaves de criptografia foram geradas, aguardando a outra parte...
        </p>
      </div>
    );
  }

  if(conversa.statusChat == "Pending" && conversa.accepted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-gray-600 p-6">
        <h2 className="text-2xl font-semibold text-center flex items-center justify-center gap-2">
          <MdPersonAdd className="text-3xl text-blue-500" />
          {conversa.otherUserName} convidou você para conversar
        </h2>

        <p className="text-sm text-center text-gray-500 max-w-md">
          Para iniciar o chat, você precisa aceitar o convite. As chaves de
          criptografia serão compartilhadas automaticamente após a confirmação.
        </p>

        <div className="flex gap-4 mt-4">
          <button
            onClick={enviarConvite}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition"
          >
            Aceitar
          </button>

          <button
            onClick={recusarConvite}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg shadow-md transition"
          >
            Recusar
          </button>
        </div>
      </div>
    );
  }

  if (conversa.statusChat === 'Blocked') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-yellow-50 p-8 rounded-2xl">
        <div className="text-center">
          <MdBlock className="text-6xl text-yellow-600 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold text-yellow-600 mb-2">
            Chat Bloqueado
          </h2>
        </div>
      </div>
    );
  }


  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="bg-primary text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-lg">{selectedConversa?.otherUserName }</h1>
          <p className="text-sm opacity-80 flex items-center gap-1">
            <MdLock className="text-base" />
            Criptografia de ponta a ponta ativa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm bg-green-500 px-2 py-1 rounded">
            Seguro
          </span>
        </div>
      </header>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Nenhuma mensagem ainda. Envie a primeira mensagem!</p>
          </div>
        ) : (
          messages.map(msg => (
            msg.text
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2 w-full">
          <input
            type="text"
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow duration-200 disabled:opacity-50"
          />
          <Button
            type="button"
            onClick={handleSend}
            className="px-4 py-2"
          >
           {/*  {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : ( */}
              <MdSend size={20} />
            {/* )} */}
          </Button>
        </div>
      </div>
    </div>
  );
}

