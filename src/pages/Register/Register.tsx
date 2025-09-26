import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { useState, type FormEvent } from "react";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";


export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        register(username, password);
        navigate("/login");
    };

    return (
    <div className="flex items-center justify-center h-screen">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-xl p-8 w-80 flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold text-center text-accent">
          Cadastro de usuário
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
        <Button type="submit">Cadastrar</Button>
      </form>
    </div>
  );
}