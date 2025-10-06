import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import { loadItem, removeItem } from "../../utils/dbIndexedDB";
import type { Conversa } from "../../hooks/useChatMessages";
import api from "../../api/api";
import { onNotificationAccepted, onNotifyReceiver } from "../../api/signalR";


type Notification = {
  creatorUserId: number;
  chatId: number;
  timestamp: Date;
};

export default function Chat() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(null);
  const [expirou, setExpirou] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchConversas = async () => {
      try {
        const response = await api.get<Conversa[]>(`/Auth/chat-users?id=${user?.id}`);
        setConversas(response.data);
      } catch (error) {
        console.error("Erro ao buscar conversas:", error);
      }
    };

    const handler = (creatorUserId: number, chatId: number) => {
      //setNotifications([]);
      setNotifications((prev) => [
        ...prev,
        { creatorUserId, chatId, timestamp: new Date() },
      ]);

      fetchConversas();
    };

   /*  const acceptedHandler = () => {
      fetchConversas();
    }; */

    onNotifyReceiver(handler);
    //onNotificationAccepted(acceptedHandler);

    
    fetchConversas();
  }, [user?.id]);



  const handleLogout = () => {
    for (const conversa of conversas) {
      removeItem("chatDB", "keys", `chat_key_${conversa.chatId}`);
      removeItem("chatDB", "keys", `public_my_${conversa.chatId}`);
      removeItem("chatDB", "keys", `public_other_${conversa.chatId}`);
      removeItem("chatDB", "messages", `chat_${conversa.chatId}`);
    }
    logoutUser();
    navigate("/login");
  };

  const iniciarConversa = async (conversa: Conversa) => {
    const existingKey = await loadItem("chatDB", "keys", `chat_key_${conversa.chatId}`);

    if (!existingKey) {
      setExpirou(false);
    } else if (existingKey.expiresAt < Date.now()) {
      setExpirou(true);
      await removeItem("chatDB", "keys", `chat_key_${conversa.chatId}`);
      await removeItem("chatDB", "keys", `public_my_${conversa.chatId}`);
      await removeItem("chatDB", "keys", `public_other_${conversa.chatId}`);
      await removeItem("chatDB", "messages", `chat_${conversa.chatId}`);
    }

    setSelectedConversa(conversa);
  };

  // função para remover notificação individual
  const dismissNotification = (index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex h-screen bg-secondary relative">
      {notifications.length > 0 && (
        <div className="absolute top-4 right-4 space-y-2 z-50 w-80">
          {notifications.map((n, idx) => (
            <div
              key={idx}
              className="bg-yellow-100 border border-yellow-300 p-3 rounded-lg shadow-md flex justify-between items-start"
            >
              <div>
                <p className="text-sm text-yellow-800 font-semibold">
                  Nova solicitação de chat
                </p>
                <p className="text-xs text-gray-600">
                   {conversas.find(x => x.otherUserId == n.creatorUserId)?.otherUserName } enviou um convite para você
                </p>
              </div>
              <button
                onClick={() => dismissNotification(idx)}
                className="text-yellow-700 hover:text-yellow-900 text-sm ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <Sidebar
        conversas={conversas}
        selectedConversa={selectedConversa}
        onSelectConversa={iniciarConversa}
        isOpen={isOpen}
        toggleSidebar={() => setIsOpen(!isOpen)}
        onLogout={handleLogout}
      />
      <ChatArea
        userId={user?.id}
        userName={user?.name}
        selectedConversa={selectedConversa}
        expirou={expirou}
      />
    </div>
  );
}
