import { useState, useEffect, useRef } from "react";
import { MdSend } from "react-icons/md";
import Button from "../../components/Button/Button";
import { encryptAES, decryptAES } from "../../utils/crypto";
import { loadItem, saveItem } from "../../utils/dbIndexedDB";

export interface Conversa {
  id: number;
  nome: string;
}

interface Message {
  id: number;
  sender: "user" | "other";
  text?: string;       // texto descriptografado para exibição
  encrypted: any;      // dados criptografados
}

interface ChatAreaProps {
  userName?: string;
  selectedConversa: Conversa | null;
  privateKey: ArrayBuffer | null;
  publicKeyOutro: ArrayBuffer | null;
  expirou: boolean
}

// Função para respostas automáticas simuladas
function respostaAutomatica(text: string) {
  const respostas = [
    "Recebi sua mensagem 😉",
    "Interessante, continue...",
    "Hmm, entendi!",
    "Pode explicar melhor?"
  ];
  return respostas[Math.floor(Math.random() * respostas.length)];
}

// Simula envio de mensagem (criptografia)
async function enviarMensagemSimulada(text: string) {
  const data = new TextEncoder().encode(text);
  const encrypted = await encryptAES(data.buffer, "simulacao"); // chave fake para simulação
  return encrypted;
}

// Simula recebimento de mensagem (descriptografia)
async function receberMensagemSimulada(encrypted: any) {
  const decrypted = await decryptAES(encrypted.cipher, encrypted.iv, encrypted.salt, "simulacao");
  return new TextDecoder().decode(decrypted);
}

export default function ChatArea({ userName, selectedConversa, expirou, privateKey, publicKeyOutro }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conviteEnviado, setConviteEnviado] = useState(false);
  const [conviteAceito, setConviteAceito] = useState(false);
  const [loading, setLoading] = useState(false);

  const lastConversaId = useRef<number | null>(null);
  const conversaId = selectedConversa?.id;

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

  // Carrega histórico local ao mudar de conversa - COM VERIFICAÇÕES
  useEffect(() => {
    if (!conversaId || expirou) {
      setMessages([]);
      return;
    }

    async function carregarHistorico() {
      setLoading(true);
      try {
        debugger
        setMessages([]);
        const historico: Message[] | undefined = await loadItem("chatDB", "messages", `chat_${conversaId}`);
        
        if (historico && Array.isArray(historico)) {
          // Descriptografa todas as mensagens para exibição
          const descriptografadas = await Promise.all(
            historico.map(async (msg) => ({
              ...msg,
              text: await receberMensagemSimulada(msg.encrypted)
            }))
          );
          setMessages(descriptografadas);
        } else {
          setMessages([]); // Garante que está vazio se não há histórico
        }
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        setMessages([]); // Limpa em caso de erro
      } finally {
        setLoading(false);
      }
    }

    setNewMessage("");
    setConviteEnviado(false);
    setConviteAceito(false);
    carregarHistorico();
  }, [conversaId, expirou]);

  

  // Salva histórico no IndexedDB sempre que mensagens mudam - COM VERIFICAÇÃO
  useEffect(() => {
    if (!conversaId || messages.length === 0 || expirou) return;

    // Verifica se a chave ainda é válida antes de salvar
    loadItem("chatDB", "keys", `chat_key_${conversaId}`).then(key => {
      if (!key || key.expiresAt < Date.now()) {
        console.log("Conversa expirada, não salvar histórico");
        return;
      }

      if (lastConversaId.current !== conversaId) {
        lastConversaId.current = conversaId;
        return;
      }

      saveItem("chatDB", "messages", `chat_${conversaId}`,
        messages.map(({ id, sender, encrypted }) => ({ id, sender, encrypted }))
      );
    });
  }, [messages, conversaId, expirou]);

  const handleSend = async () => {
    if (!newMessage.trim() || !publicKeyOutro) return;

    // Encripta a mensagem do usuário
    const encrypted = await enviarMensagemSimulada(newMessage);

    // Adiciona mensagem do usuário ao chat
    setMessages(prev => [...prev, { 
      id: Date.now(), // ⬅️ Usa timestamp para IDs únicos
      sender: "user", 
      text: newMessage, 
      encrypted 
    }]);
    setNewMessage("");

    // Simula resposta do outro usuário
    setTimeout(async () => {
      const resposta = respostaAutomatica(newMessage);
      const encryptedResposta = await enviarMensagemSimulada(resposta);
      const received = await receberMensagemSimulada(encryptedResposta);
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, // ⬅️ Garante ID único
        sender: "other", 
        text: received, 
        encrypted: encryptedResposta 
      }]);
    }, 1000);
  };

  // Envia convite para iniciar conversa
  const enviarConvite = () => {
    setConviteEnviado(true);
    setTimeout(() => setConviteAceito(true), 2000); // simula aceitação
  };

  // --- Renderização ---
  if (!selectedConversa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-2xl font-semibold mb-2">👋 Olá {userName}</h2>
        <p className="text-lg">Selecione uma conversa na lista para começar</p>
      </div>
    );
  }

  // Mostrar mensagem de expirado
  if (expirou) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-2xl font-semibold mb-2">🔒 Sessão Expirada</h2>
        <p className="text-lg">Recarregando a conversa...</p>
      </div>
    );
  }

  // ⬇️ Mostrar loading enquanto carrega histórico
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-2xl font-semibold">Carregando conversa...</h2>
      </div>
    );
  }

  if (!conviteEnviado && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
        <h2 className="text-2xl font-semibold">Iniciar conversa com {selectedConversa.nome}</h2>
        <Button className="px-6 py-2" onClick={enviarConvite}>Enviar Convite</Button>
      </div>
    );
  }

  if (!conviteAceito && messages.length === 0) {
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