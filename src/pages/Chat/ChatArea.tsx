import { useState, useEffect, useRef } from "react";
import { MdSend } from "react-icons/md";
import Button from "../../components/Button/Button";
import { encryptAES, publicKeyToPassword } from "../../utils/crypto";
import { loadItem, saveItem } from "../../utils/dbIndexedDB";
import { salvarChavePrivada } from "../../utils/keysIndexedDB";
import { gerarChaves } from "../../utils/keys";

export interface Conversa {
  id: number;
  nome: string;
}

interface Message {
  id: number;
  sender: "user" | "other";
  text?: string;
  encrypted: any;
}

interface ChatAreaProps {
  userName?: string;
  selectedConversa: Conversa | null;
  expirou: boolean;
}

// 🔁 Resposta automática fake
function respostaAutomatica(text: string) {
  const respostas = [
    "Recebi sua mensagem 😉",
    "Interessante, continue...",
    "Hmm, entendi!",
    "Pode explicar melhor?"
  ];
  return respostas[Math.floor(Math.random() * respostas.length)];
}

export default function ChatArea({ userName, selectedConversa, expirou }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conviteEnviado, setConviteEnviado] = useState(false);
  const [conviteAceito, setConviteAceito] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expiracaoChat, setExpiracaoChat] = useState(expirou);

  const [otherPublicKey, setOtherPublicKey] = useState<ArrayBuffer | null>(null);
  const[myPublicKey, setMyPublicKey] = useState<ArrayBuffer | null>(null);

  const lastConversaId = useRef<number | null>(null);
  const conversaId = selectedConversa?.id;

  // 📤 Enviar ou reenviar convite
  const enviarConvite = async () => {
    if (!conversaId) return;

    // 1. Gera meu par de chaves
    const keyPair = await gerarChaves();
    const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);

    const expiresAt = Date.now() + 1000 * 60 * 2; // 2min para teste
    setExpiracaoChat(false);
    await salvarChavePrivada(conversaId.toString(), privateKeyBuffer, "tokenFake", expiresAt);
    await saveItem("chatDB", "keys", `public_my_${conversaId}`, publicKeyBuffer);

    setMyPublicKey(await loadItem("chatDB", "keys", `public_my_${conversaId}`))
    setConviteEnviado(true);
    setConviteAceito(false);

    console.log("📤 Convite enviado com minhas chaves");

    // 2. Simula aceite do outro usuário (2s depois)
    setTimeout(async () => {
      //Aqui vai ficar a requisição webSocket

      /* Simula o outro usuario aceitando o convite e criando as chaves */
      const otherPair = await gerarChaves();
      const otherPrivateKeyBuffer = await crypto.subtle.exportKey("pkcs8", otherPair.privateKey);
      const otherPublicKeyBuffer = await crypto.subtle.exportKey("spki", otherPair.publicKey); // trocar isso para chave que retornar do webSocket

      const otherExpiresAt = Date.now() + 1000 * 60 * 2;
      //Isso aqui não vai existir, somente para simular outro usuario
      await salvarChavePrivada(`other_${conversaId}`, otherPrivateKeyBuffer, "tokenFake", otherExpiresAt);
      /* -------------------------------------------------------------- */

      await saveItem("chatDB", "keys", `public_other_${conversaId}`, otherPublicKeyBuffer); // salva no DB a chave que retorna no webSocket
      setOtherPublicKey(otherPublicKeyBuffer);

      setConviteAceito(true);
      console.log("✅ Convite aceito, chave pública do outro salva");
    }, 2000);
  };

  // ✉️ Enviar mensagem
  const handleSend = async () => {
    if (!newMessage.trim() || !otherPublicKey || !myPublicKey) return;

    const data = new TextEncoder().encode(newMessage);
    const password = await publicKeyToPassword(otherPublicKey);
    const encrypted = await encryptAES(data.buffer, password);

    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: "user",
      text: newMessage,
      encrypted
    }]);
    setNewMessage("");

    // Resposta simulada - isso aqui é como se fosse o usuario envidando a menssagem
    setTimeout(async () => {
      const resposta = respostaAutomatica(newMessage);
      const respostaData = new TextEncoder().encode(resposta);
      const password = await publicKeyToPassword(myPublicKey);
      const encryptedResposta = await encryptAES(respostaData.buffer, password);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: "other",
        text: resposta,
        encrypted: encryptedResposta
      }]);
    }, 1000);
  };

  // Efeito para limpar mensagens quando expirar
  useEffect(() => {
    if (expirou && conversaId) {
      console.log("Token expirado - limpando mensagens");
      setMessages([]);
      setConviteEnviado(false);
      setConviteAceito(false);
      setNewMessage("");
    }
  }, [expirou, conversaId]);

  // 🔄 Carregar histórico
  useEffect(() => {
    if (!conversaId || expirou) {
      setMessages([]);
      setConviteEnviado(false);
      setConviteAceito(false);
      setNewMessage("");
      return;
    }

    async function carregarHistorico() {
      setLoading(true);
      try {
        const historico: Message[] | undefined = await loadItem("chatDB", "messages", `chat_${conversaId}`);
        setMessages(historico && Array.isArray(historico) ? historico : []);
        if(!historico && !Array.isArray(historico)){
          setConviteEnviado(false);
          setConviteAceito(false);
          setNewMessage("");
          setMyPublicKey(null);
          setOtherPublicKey(null);
        }
        
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        setMessages([]);
        setConviteEnviado(false);
        setConviteAceito(false);
        setNewMessage("");
      } finally {
        setLoading(false);
      }
    }

    carregarHistorico();
  }, [conversaId, expirou]);

  // 💾 Salvar histórico
  useEffect(() => {
    if (!conversaId || messages.length === 0 || expirou) return;

    if (lastConversaId.current !== conversaId) {
      lastConversaId.current = conversaId;
      return;
    }

    saveItem("chatDB", "messages", `chat_${conversaId}`, messages);
  }, [messages, conversaId, expirou]);

  // --- Renderização ---
  if (!selectedConversa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-2xl font-semibold mb-2">👋 Olá {userName}</h2>
        <p className="text-lg">Selecione uma conversa na lista para começar</p>
      </div>
    );
  }

  if (expiracaoChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-red-50">
        <p className="text-red-600 font-semibold">
          ⏰ O chat para {selectedConversa.nome} expirou
        </p>
        <Button className="px-6 py-2 bg-red-600 text-white hover:bg-red-700" onClick={enviarConvite}>
          Reenviar convite
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-2xl font-semibold">Carregando conversa...</h2>
      </div>
    );
  }

  debugger
  if (!myPublicKey) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
        <h2 className="text-2xl font-semibold">Iniciar conversa com {selectedConversa.nome}</h2>
        <Button className="px-6 py-2" onClick={enviarConvite}>Enviar Convite</Button>
      </div>
    );
  }

  if (!otherPublicKey && myPublicKey) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
        <h2 className="text-2xl font-semibold">⏳ Aguardando {selectedConversa.nome} aceitar o convite...</h2>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-primary text-white p-4 flex justify-between items-center">
        <h1 className="font-bold text-lg">{selectedConversa.nome}</h1>
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

      <div className="p-4 bg-white flex gap-2 w-full">
        <input
          type="text"
          placeholder="Digite sua mensagem..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow duration-200"
        />
        <Button onClick={handleSend}><MdSend size={20} /></Button>
      </div>
    </div>
  );
}
