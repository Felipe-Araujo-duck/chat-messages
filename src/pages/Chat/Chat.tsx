import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { useState } from "react";
import Sidebar from "./Sidebar";
import ChatArea, { type Conversa } from "./ChatArea";
import { loadItem, removeItem } from "../../utils/dbIndexedDB";

export default function Chat() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const [conversas] = useState<Conversa[]>([
    { id: 1, nome: "João" },
    { id: 2, nome: "Maria" },
    { id: 3, nome: "Equipe Suporte" },
    { id: 4, nome: "Ana" },
  ]);

  const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(null);
  const [expirou, setExpirou] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    for (const conversa of conversas) {
      removeItem("chatDB", "keys", `chat_key_${conversa.id}`);
      removeItem("chatDB", "keys", `public_my_${conversa.id}`);
      removeItem("chatDB", "keys", `public_other_${conversa.id}`);
      removeItem("chatDB", "messages", `chat_${conversa.id}`);
    }
    logoutUser();
    navigate("/login");
  };

  const iniciarConversa = async (conversa: Conversa) => {
    const existingKey = await loadItem("chatDB", "keys", `chat_key_${conversa.id}`);

    if (!existingKey) {      
      setExpirou(false); // reset de expiração
    } else if (existingKey.expiresAt < Date.now()) {
      setExpirou(true);
      await removeItem("chatDB", "keys", `chat_key_${conversa.id}`);
      await removeItem("chatDB", "keys", `public_my_${conversa.id}`);
      await removeItem("chatDB", "keys", `public_other_${conversa.id}`);
      await removeItem("chatDB", "messages", `chat_${conversa.id}`);
    }

    setSelectedConversa(conversa);
    
  };

  return (
    <div className="flex h-screen bg-secondary">
      <Sidebar
        conversas={conversas}
        selectedConversa={selectedConversa}
        onSelectConversa={iniciarConversa}
        isOpen={isOpen}
        toggleSidebar={() => setIsOpen(!isOpen)}
        onLogout={handleLogout}
      />
      <ChatArea
        userName={user?.name}
        selectedConversa={selectedConversa}
        expirou={expirou}
      />
    </div>
  );
}
