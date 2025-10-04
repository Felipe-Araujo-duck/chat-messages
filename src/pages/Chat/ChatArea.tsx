import { useState, useEffect, useRef } from "react";
import { MdSend } from "react-icons/md";
import Button from "../../components/Button/Button";
import { useChatMessages, type Conversa } from "../../hooks/useChatMessages";
import { gerarChaves } from "../../utils/keys";
import { exportPublicKey } from "../../utils/crypto/rsa";
import { useConversasState } from "../../hooks/useConversasState";
import { useExpiration } from "../../hooks/useExpiration";
import { useChatKeys } from "../../hooks/userChatKeys";

interface ChatAreaProps {
  userName?: string;
  selectedConversa: Conversa | null;
  expirou: boolean;
}

function respostaAutomatica(text: string) {
  const respostas = [
    "Recebi sua mensagem 😉",
    "Interessante, continue...",
    "Hmm, entendi!",
    "Pode explicar melhor?"
  ];
  return respostas[Math.floor(Math.random() * respostas.length)];
}

// Componente para mensagem com decrypt assíncrono
function DecryptingMessage({ message, decryptMessage }: { 
  message: any; 
  decryptMessage: (msg: any) => Promise<string>; 
}) {
  const [text, setText] = useState<string>("Decifrando...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const decrypt = async () => {
      try {
        const decryptedText = await decryptMessage(message);
        if (mounted) {
          setText(decryptedText);
        }
      } catch (err) {
        if (mounted) {
          setError("Falha ao decifrar");
          console.error('Erro ao decifrar:', err);
        }
      }
    };

    decrypt();

    return () => {
      mounted = false;
    };
  }, [message, decryptMessage]);

  return (
    <div className={`p-3 rounded-lg max-w-xs shadow ${
      message.sender === "user" 
        ? "bg-blue-500 text-white self-end" 
        : "bg-gray-200 text-gray-800 self-start"
    }`}>
      {error || text}
    </div>
  );
}

export default function ChatArea({ userName, selectedConversa, expirou: expiradoProp }: ChatAreaProps) {
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  
  const conversaId = selectedConversa?.id;

  // Hook de expiração melhorado
  const { 
    expirou, 
    renovarExpiracao, 
    forcarExpiração 
  } = useExpiration(expiradoProp, Number(conversaId));

  const {
    conversasState,
    initializeConversa,
    updateConversaState,
    getConversaState,
  } = useConversasState();

  const currentConversaState = getConversaState(conversaId || null);

  // Hooks de chaves e mensagens
  const {
    myPrivateKey,
    myPublicKey,
    otherPublicKey,
    loading: keysLoading,
    loadKeys,
    generateMyKeys,
    setOtherUserPublicKey,
    clearKeys,
  } = useChatKeys(conversaId || null);

  const {
    messages,
    loading: messagesLoading,
    loadMessages,
    addMessage,
    decryptMessage,
    encryptMessage,
    clearMessages,
  } = useChatMessages(conversaId || null, myPrivateKey);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Limpar estado quando a conversa mudar
  useEffect(() => {
    setNewMessage("");
    setSending(false);
  }, [conversaId]);

  // Inicializar conversa quando selecionada
  useEffect(() => {
    if (selectedConversa && !currentConversaState) {
      initializeConversa(selectedConversa);
    }
  }, [selectedConversa, currentConversaState, initializeConversa]);

  // Forçar expiração se veio da prop
  useEffect(() => {
    if (expiradoProp) {
      forcarExpiração();
    }
  }, [expiradoProp, forcarExpiração]);

  // Atualizar estado da conversa quando chaves mudarem
  useEffect(() => {
    if (!conversaId) return;

    let newStatus: 'pending' | 'ready' | 'invited' = 'pending';
    
    if (myPublicKey && otherPublicKey) {
      newStatus = 'ready';
    } else if (myPublicKey && !otherPublicKey) {
      newStatus = 'invited';
    }

    updateConversaState(conversaId, {
      status: newStatus,
      myPublicKey,
      otherPublicKey,
    });
  }, [conversaId, myPublicKey, otherPublicKey, updateConversaState]);

  // Carregar dados quando a conversa for selecionada
  useEffect(() => {
    if (!conversaId || expirou) return;

    const initializeChat = async () => {
      await loadKeys();
      await loadMessages();
    };

    initializeChat();
  }, [conversaId, expirou, loadKeys, loadMessages]);

  // Scroll para baixo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Enviar ou reenviar convite
  const enviarConvite = async () => {
    if (!conversaId) return;

    try {
      
      // Se está expirado, limpar estado primeiro
      if (expirou) {
        clearKeys();
        clearMessages();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Renovar expiração
      renovarExpiracao(2);
      
      // Gerar novas chaves
      await generateMyKeys();
      
      updateConversaState(conversaId, { status: 'invited' });

      // Simular aceitação após 2 segundos
      setTimeout(async () => {
        try {
          const otherPair = await gerarChaves();
          const otherPublicKeyBuffer = await exportPublicKey(otherPair.publicKey);
          
          await setOtherUserPublicKey(otherPublicKeyBuffer);
          updateConversaState(conversaId, { status: 'ready' });
          
        } catch (error) {
          console.error('Erro ao simular aceitação:', error);
        }
      }, 2000);

    } catch (error) {
      console.error('Erro ao enviar convite:', error);
    }
  };

  //Enviar mensagem
  const handleSend = async () => {
    if (!newMessage.trim() || !otherPublicKey || !myPublicKey || sending || expirou) return;

    setSending(true);
    try {
      // Renovar expiração
      renovarExpiracao(2);
      const encryptedForOther = await encryptMessage(newMessage, otherPublicKey);
      const encryptedForMe = await encryptMessage(newMessage, myPublicKey);

      await addMessage({
        sender: "user",
        encrypted: encryptedForMe,
        publicKey: myPublicKey,
      });

      setNewMessage("");

      setTimeout(async () => {
        try {
          renovarExpiracao(2);
          const resposta = respostaAutomatica(newMessage);
          const encryptedResposta = await encryptMessage(resposta, myPublicKey);

          await addMessage({
            sender: "other",
            encrypted: encryptedResposta,
            publicKey: otherPublicKey,
          });
        } catch (error) {
          console.error('Erro na resposta automática:', error);
        }
      }, 1000);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!selectedConversa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-2xl font-semibold mb-2">👋 Olá {userName}</h2>
        <p className="text-lg">Selecione uma conversa na lista para começar</p>
      </div>
    );
  }

  if (expirou) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-red-50 p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Chat Expirado
          </h2>
          <p className="text-red-500">
            A sessão para <strong>{selectedConversa.nome}</strong> expirou
          </p>
          <p className="text-sm text-gray-500 mt-2">
            As mensagens foram apagadas por segurança
          </p>
        </div>
        
        <div className="flex justify-center">
          <Button
            className="flex flex-row items-center gap-2 px-6 py-3 bg-red-600 text-white hover:bg-red-700"
            onClick={enviarConvite}
          >
            Reenviar Convite
          </Button>
        </div>
        
        <p className="text-xs text-gray-400 text-center max-w-sm">
          🔒 Um novo par de chaves será gerado para garantir a segurança da conversa
        </p>
      </div>
    );
  }

  if (keysLoading || messagesLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-2xl font-semibold">Carregando conversa...</h2>
      </div>
    );
  }

  if (!currentConversaState?.myPublicKey) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500 p-4">
        <h2 className="text-2xl font-semibold text-center">
          Iniciar conversa com {selectedConversa.nome}
        </h2>
        <Button 
          className="px-6 py-2" 
          onClick={enviarConvite} 
          disabled={keysLoading}
        >
          {keysLoading ? "Gerando chaves..." : "Enviar Convite"}
        </Button>
      </div>
    );
  }

  if (currentConversaState.status === 'invited') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500 p-4">
        <h2 className="text-2xl font-semibold text-center">
          ⏳ Aguardando {selectedConversa.nome} aceitar o convite...
        </h2>
        <p className="text-sm text-center">
          As chaves de criptografia foram geradas, aguardando a outra parte...
        </p>
        
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="bg-primary text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-lg">{selectedConversa.nome}</h1>
          <p className="text-sm opacity-80">🔒 Criptografia de ponta a ponta ativa</p>
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
            <DecryptingMessage
              key={msg.id}
              message={msg}
              decryptMessage={decryptMessage}
            />
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
            disabled={sending}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow duration-200 disabled:opacity-50"
          />
          <Button 
            onClick={handleSend} 
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2"
          >
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