import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { useState } from "react";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";

export default function Login() {
    const { loginUser } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await loginUser(username, password);
      navigate("/chat");
    } catch {
      alert("Erro ao fazer login");
    }
  }

    return (
        <div className="flex items-center justify-center h-screen">
            <form onSubmit={handleSubmit}
            className="bg-white shadow-lg rounded-xl p-8 w-80 flex flex-col gap-4">
                <h1 className="text-2xl font-bold text-center text-accent">
                    Login
                </h1>
                <Input
                    label="Nome"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <Input
                    label="Senha"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <Button type="submit">Entrar</Button>
                <Button type="button" onClick={() => navigate("/register")}>
                    Registrar
                </Button>

            </form>
        </div>
        

        
    )

}