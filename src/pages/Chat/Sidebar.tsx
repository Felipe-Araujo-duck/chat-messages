import { useEffect, useState } from "react";
import { MdClose, MdMenu, MdLogout } from "react-icons/md";
import type { Conversa } from "../../hooks/useChatMessages";
import api from "../../api/api";
import { getProfile } from "../../services/authService";
import type { User } from "../../auth/authContext";

interface SidebarProps {
  conversas: Conversa[];
  selectedConversa: Conversa | null;
  onSelectConversa: (c: Conversa) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  onLogout: () => void;
}

const user: User | null = getProfile();

export default function Sidebar({
  conversas: initialConversas,
  selectedConversa,
  onSelectConversa,
  isOpen,
  toggleSidebar,
  onLogout,
}: SidebarProps) {
  // Estado interno para guardar as conversas vindas da API
  const [conversas, setConversas] = useState<Conversa[]>(initialConversas);

  useEffect(() => {
    const fetchConversas = async () => {
      try {
        const response = await api.get<Conversa[]>(`/Auth/chat-users?id=${user?.id}`);
        setConversas(response.data);
      } catch (error) {
        console.error("Erro ao buscar conversas:", error);
      }
    };

    fetchConversas();
  }, []);

  return (
    <aside
      className={`
        bg-gray-100 h-full flex flex-col transition-all duration-300
        ${isOpen ? "w-64" : "w-16"}
      `}
    >
      {/* Botão abrir/fechar */}
      <button
        onClick={toggleSidebar}
        className="m-2 p-2 bg-primary text-white rounded-md focus:outline-none flex items-center justify-center"
      >
        {isOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
      </button>

      {/* Lista de conversas */}
      <ul className="flex-1 overflow-y-auto m-2">
        {conversas.map((c) => (
          <li
            key={c.chatId || c.otherUserId}
            className={`
              flex items-center p-2 my-1 rounded-lg cursor-pointer
              ${selectedConversa?.chatId === c.chatId ? "bg-primary text-white" : "bg-white"}
              hover:bg-primary/50 hover:text-white
              transition-colors
            `}
            onClick={() => onSelectConversa(c)}
          >
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-sm font-bold
                ${c.statusChat === "Active" ? "bg-green-500" : "bg-gray-400"}
              `}
            >
              {c.otherUserName[0]}
            </div>
            {isOpen && <span className="ml-3">{c.otherUserName}</span>}
          </li>
        ))}
      </ul>

      {/* Botão de logout */}
      <button
        onClick={onLogout}
        className="m-2 p-2 bg-red-500 text-white rounded-md flex items-center justify-center"
      >
        <MdLogout size={20} />
        {isOpen && <span className="ml-2">Sair</span>}
      </button>
    </aside>
  );
}
