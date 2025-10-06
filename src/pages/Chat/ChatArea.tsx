import { useState, useEffect, useRef, useCallback } from "react";
import { MdAlarm, MdBlock, MdHourglassEmpty, MdLock, MdPersonAdd, MdSend, MdWavingHand } from "react-icons/md";
import Button from "../../components/Button/Button";
import { useChatMessages, type Conversa } from "../../hooks/useChatMessages";
import { gerarChaves } from "../../utils/keys";
import { exportPublicKey } from "../../utils/crypto/rsa";
import { useConversasState, type ConversaState } from "../../hooks/useConversasState";
import { useExpiration } from "../../hooks/useExpiration";
import { useChatKeys } from "../../hooks/userChatKeys";
import { joinChat, onNotificationAccepted, onNotifyReceiver, onNotifyRefused, onReceiveMessage, sendMessage } from "../../api/signalR";

interface ChatAreaProps {
  userId?: number;
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
    <div className={`p-3 rounded-lg max-w-xs shadow ${message.sender === "user"
        ? "bg-blue-500 text-white self-end"
        : "bg-gray-200 text-gray-800 self-start"
      }`}>
      {error || text}
    </div>
  );
}

export default function ChatArea({ userId, userName, selectedConversa, expirou: expiradoProp }: ChatAreaProps) {
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [conversaId, updateConversaId] = useState<number>(0);

  // Efeito para atualizar conversaId quando selectedConversa mudar
  useEffect(() => {
    if (selectedConversa?.chatId && selectedConversa.chatId !== conversaId) {
      console.log('🔄 [ChatArea] Atualizando conversaId:', selectedConversa.chatId);
      updateConversaId(selectedConversa.chatId);
    }
  }, [selectedConversa, conversaId]);

  // Hook de expiração
  const {
    expirou,
    renovarExpiracao,
    forcarExpiração
  } = useExpiration(expiradoProp, Number(conversaId));

  // Estado das conversas
  const {
    conversasState,
    initializeConversa,
    updateConversaState,
    getConversaState,
  } = useConversasState();

  const currentConversaState = getConversaState(conversaId || null);

  // Chaves de criptografia
  const {
    myPrivateKey,
    myPublicKey,
    otherPublicKey,
    loading: keysLoading,
    loadKeys,
    generateMyKeys,
    setOtherUserPublicKey,
    clearKeys,
    forceReload,
  } = useChatKeys(conversaId || null);

  // Mensagens
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
      console.log('🔄 [ChatArea] Inicializando nova conversa:', selectedConversa.chatId);
      initializeConversa(selectedConversa);
    }
  }, [selectedConversa, currentConversaState, initializeConversa]);

  // Forçar expiração se veio da prop
  useEffect(() => {
    if (expiradoProp) {
      console.log('⚠️ [ChatArea] Expiração forçada da prop');
      forcarExpiração();
    }
  }, [expiradoProp, forcarExpiração]);

  // Atualizar estado da conversa quando chaves mudarem
  useEffect(() => {
    if (!conversaId || !selectedConversa) return;

    console.log('🔄 [ChatArea] Atualizando estado da conversa com chaves:', {
      conversaId,
      temMyPublicKey: !!myPublicKey,
      temOtherPublicKey: !!otherPublicKey
    });

    const updates: Partial<any> = {
      conversa: { ...selectedConversa },
      myPublicKey,
      otherPublicKey,
    };

    // Atualizar status baseado nas chaves
    if (myPublicKey && otherPublicKey) {
      updates.conversa.statusChat = 'Active';
    } else if (myPublicKey && !otherPublicKey) {
      updates.conversa.statusChat = 'Pending';
    }

    updateConversaState(conversaId, updates);
  }, [conversaId, myPublicKey, otherPublicKey, selectedConversa, updateConversaState]);

  // Carregar dados quando a conversa for selecionada
  useEffect(() => {
    if (!conversaId || expirou) return;

    console.log('🔄 [ChatArea] Carregando dados para conversa:', conversaId);
    
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

  // Handlers de WebSocket
  // No seu ChatArea, substitua o useEffect problemático por este:
useEffect(() => {
  if (!conversaId || !selectedConversa) return;

  console.log('🔄 [ChatArea] Atualizando estado da conversa com chaves:', {
    conversaId,
    temMyPublicKey: !!myPublicKey,
    temOtherPublicKey: !!otherPublicKey
  });

  // Determinar o status baseado nas chaves
  let novoStatus: 'Pending' | 'Active' | 'Blocked' | null = selectedConversa.statusChat;
  
  if (myPublicKey && otherPublicKey) {
    novoStatus = 'Active';
  } else if (myPublicKey && !otherPublicKey) {
    novoStatus = 'Pending';
  }

  const conversaAtualizada: Conversa = {
    ...selectedConversa,
    statusChat: novoStatus
  };

  const updates: Partial<ConversaState> = {
    conversa: conversaAtualizada,
    myPublicKey,
    otherPublicKey,
  };

  updateConversaState(conversaId, updates);
}, [conversaId, myPublicKey, otherPublicKey, selectedConversa, updateConversaState]);

  // Recusar convite
  const recusarConvite = async () => {
    try {
      console.log('❌ [ChatArea] Recusando convite');
      const convite = await joinChat(userId!, selectedConversa?.otherUserId ?? 0, selectedConversa?.chatId, false);
      
      if (selectedConversa) {
        const conversaAtualizada = {
          ...selectedConversa,
          statusChat: convite.status,
          chatId: convite.id,
        };
        
        // Atualizar na ordem correta
        updateConversaId(conversaAtualizada.chatId);
        // Aguardar um ciclo de renderização
        setTimeout(() => {
          updateConversaState(conversaAtualizada.chatId, { conversa: conversaAtualizada });
        }, 0);
      }
    } catch (error) {
      console.error('Erro ao recusar convite:', error);
    }
  };

  // Enviar ou reenviar convite
  const enviarConvite = async () => {
    try {
      console.log('✅ [ChatArea] Enviando convite');
      const convite = await joinChat(userId!, selectedConversa?.otherUserId ?? 0, selectedConversa?.chatId, true);

      if (selectedConversa) {
        const conversaAtualizada = {
          ...selectedConversa,
          statusChat: convite.status,
          chatId: convite.id,
        };

        console.log('🔄 [ChatArea] Atualizando estado com novo chatId:', conversaAtualizada.chatId);
        
        // 1. Atualizar conversaId primeiro
        updateConversaId(conversaAtualizada.chatId);
        
        // 2. Aguardar próximo ciclo de renderização
        setTimeout(async () => {
          // 3. Atualizar estado da conversa
          updateConversaState(conversaAtualizada.chatId, { conversa: conversaAtualizada });

          // 4. Se está expirado, limpar estado primeiro
          if (expirou) {
            console.log('🗑️ [ChatArea] Limpando estado expirado');
            clearKeys();
            clearMessages();
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // 5. Renovar expiração
          renovarExpiracao(2);

          // 6. Gerar novas chaves
          console.log('🔑 [ChatArea] Gerando chaves para:', conversaAtualizada.chatId);
          await generateMyKeys(conversaAtualizada.chatId);
        }, 0);
      }

    } catch (error) {
      console.error('Erro ao enviar convite:', error);
    }
  };

  // Enviar mensagem
  const handleSend = async () => {
    if (!newMessage.trim() || !otherPublicKey || !myPublicKey || sending || expirou) return;

    setSending(true);
    try {
      // Renovar expiração
      renovarExpiracao(2);
      
      const encryptedForOther = await encryptMessage(newMessage, otherPublicKey);
      const encryptedForMe = await encryptMessage(newMessage, myPublicKey);

      const encryptedForOtherBase64 = btoa(
        String.fromCharCode(...new Uint8Array(encryptedForOther))
      );
      
      await sendMessage(conversaId ?? 0, encryptedForOtherBase64);

      await addMessage({
        sender: "user",
        encrypted: encryptedForMe,
        publicKey: myPublicKey,
      });

      setNewMessage("");

      // Resposta automática
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

  // Debug do estado atual
  useEffect(() => {
    console.log('🔍 [ChatArea] Estado atual:', {
      conversaId,
      selectedConversaId: selectedConversa?.chatId,
      currentConversaState: !!currentConversaState,
      expirou,
      myPublicKey: !!myPublicKey,
      otherPublicKey: !!otherPublicKey,
      messagesCount: messages.length
    });
  }, [conversaId, selectedConversa, currentConversaState, expirou, myPublicKey, otherPublicKey, messages]);

  if (!selectedConversa) {
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

  if (expirou) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-red-50 p-8 rounded-2xl">
        <div className="text-center">
          <MdAlarm className="text-6xl text-red-600 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Chat Expirado
          </h2>
          <p className="text-red-500">
            A sessão para <strong>{selectedConversa.otherUserName}</strong> expirou
          </p>
          <p className="text-sm text-gray-500 mt-2">
            As mensagens foram apagadas por segurança
          </p>
        </div>

        <Button
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition"
          onClick={enviarConvite}
        >
          Reenviar Convite
        </Button>

        <p className="text-sm opacity-80 flex items-center gap-1">
          <MdLock className="text-base" />
          Um novo par de chaves será gerado para garantir a segurança da conversa
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

  if (!currentConversaState?.myPublicKey && !selectedConversa.statusChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500 p-4">
        <h2 className="text-2xl font-semibold text-center">
          Iniciar conversa com {selectedConversa.otherUserName}
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

  if (currentConversaState?.conversa.statusChat === 'Pending' && !currentConversaState?.conversa.accepted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500 p-4">
        <h2 className="text-2xl font-semibold text-center flex items-center justify-center gap-2">
          <MdHourglassEmpty className="text-2xl animate-spin" />
          Aguardando {selectedConversa.otherUserName} aceitar o convite...
        </h2>
        <p className="text-sm text-center">
          As chaves de criptografia foram geradas, aguardando a outra parte...
        </p>
      </div>
    );
  }

  if (currentConversaState?.conversa.statusChat === 'Pending' && currentConversaState?.conversa.accepted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-gray-600 p-6">
        <h2 className="text-2xl font-semibold text-center flex items-center justify-center gap-2">
          <MdPersonAdd className="text-3xl text-blue-500" />
          {selectedConversa.otherUserName} convidou você para conversar
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

  if (currentConversaState?.conversa.statusChat === 'Blocked') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-yellow-50 p-8 rounded-2xl">
        <div className="text-center">
          <MdBlock className="text-6xl text-yellow-600 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold text-yellow-600 mb-2">
            Chat Bloqueado
          </h2>
          <p className="text-yellow-500">
            <strong>{selectedConversa.otherUserName}</strong> Recusou seu convite!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="bg-primary text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-lg">{selectedConversa.otherUserName}</h1>
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
            type="button"
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