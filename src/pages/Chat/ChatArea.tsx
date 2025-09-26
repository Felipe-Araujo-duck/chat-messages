import { MdSend } from "react-icons/md";
import Button from "../../components/Button/Button";

interface Conversa {
  id: number;
  nome: string;
}

interface ChatAreaProps {
  userName?: string;
  selectedConversa: Conversa;
}

export default function ChatArea({ userName, selectedConversa }: ChatAreaProps) {
  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-primary text-white p-4 flex justify-between items-center">
        <h1 className="font-bold text-lg">{selectedConversa?.nome}</h1>
      </header>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2">
        <div className="bg-white self-start p-3 rounded-lg shadow">
          Olá {userName}, seja bem-vindo!
        </div>
        <div className="bg-blue-500 text-white self-end p-3 rounded-lg shadow">
          Obrigado!
        </div>
      </div>

      <div className="p-4 bg-white flex gap-2 w-full">
        <input
          type="text"
          placeholder="Digite sua mensagem..."
          className="
            flex-1 border border-gray-300 rounded-lg px-3 py-2 
            focus:outline-none focus:ring-2 focus:ring-primary/30
            transition-shadow duration-200
          "
        />
        <Button className="px-4 py-2"><MdSend size={20} /></Button>
      </div>
    </div>
  );
}
