import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { useState } from "react";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";

export default function Chat() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [conversas] = useState([
    { id: 1, nome: "João" },
    { id: 2, nome: "Maria" },
    { id: 3, nome: "Equipe Suporte" },
    { id: 4, nome: "Ana" },
  ]);
  const [selectedConversa, setSelectedConversa] = useState(conversas[0]);
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-secondary">
      <Sidebar
        conversas={conversas}
        selectedConversa={selectedConversa}
        onSelectConversa={setSelectedConversa}
        isOpen={isOpen}
        toggleSidebar={() => setIsOpen(!isOpen)}
        onLogout={handleLogout}
      />
      <ChatArea userName={user?.name} selectedConversa={selectedConversa} />
    </div>
  );
}
