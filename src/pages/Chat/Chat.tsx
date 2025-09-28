import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import ChatArea, { type Conversa } from "./ChatArea";
import { loadItem, removeItem, saveItem } from "../../utils/dbIndexedDB";
import { salvarChavePrivada } from "../../utils/keysIndexedDB";
import { gerarChaves } from "../../utils/keys";

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
  const [privateKey, setPrivateKey] = useState<ArrayBuffer | null>(null);
  const [publicKeyMy, setPublicKeyMy] = useState<ArrayBuffer | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [keysLoaded, setKeysLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        debugger
        const keyPair = await gerarChaves();
        const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
        const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);

        setPrivateKey(privateKeyBuffer);
        setPublicKeyMy(publicKeyBuffer);
        setKeysLoaded(true);
      } catch (error) {
        console.error("Erro ao gerar chaves:", error);
        setKeysLoaded(true);
      }
    })();
  }, []);

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const [expirou, setExpirou] = useState(false);

  const iniciarConversa = async (conversa: Conversa) => {
    setSelectedConversa(conversa);
    if (keysLoaded && privateKey) {
      try {
        const existingKey = await loadItem("chatDB", "keys", `chat_key_${conversa.id}`);
        
        if (!existingKey) {
          const expiresAt = Date.now() + 1000 * 60 * 2; // 2 minutos
          await salvarChavePrivada(conversa.id.toString(), privateKey, "tokenFake", expiresAt);
          await saveItem("chatDB", "keys", `public_${conversa.id}`, publicKeyMy);
          setExpirou(false);
        } else if (existingKey.expiresAt < Date.now()) {
          console.log('chave expirou - limpando dados');
          setExpirou(true);
          
          await removeItem("chatDB", "keys", `chat_key_${conversa.id}`);
          await removeItem("chatDB", "keys", `public_${conversa.id}`);
          await removeItem("chatDB", "messages", `chat_${conversa.id}`);
          
          // Recria a chave com novo expiration
          const newExpiresAt = Date.now() + 1000 * 60 * 2;
          await salvarChavePrivada(conversa.id.toString(), privateKey, "tokenFake", newExpiresAt);
          await saveItem("chatDB", "keys", `public_${conversa.id}`, publicKeyMy);
          setExpirou(false);
        } else {
          setExpirou(false);
        }
      } catch (error) {
        console.error("Erro ao salvar chaves:", error);
      }
    }
  };

  if (!keysLoaded) {
    return (
      <div className="flex h-screen bg-secondary items-center justify-center">
        <div className="text-lg">Carregando chaves de segurança...</div>
      </div>
    );
  }

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
        privateKey={privateKey}
        publicKeyOutro={publicKeyMy}
        expirou={expirou}
      />
    </div>
  );
}