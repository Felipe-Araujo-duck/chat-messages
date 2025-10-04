import api from "../api/api";

export async function login(username: string, password: string) {
  const response = await api.post("/login", { username, password });
  // o backend deve responder com Set-Cookie contendo o token
  return response.data;
}

export async function register(name: string, password: string) {
  const response = await api.post("/Auth/register", { name, password });
  return response.data;
}

export async function logout() {
  await api.post("/logout");
}

export async function getProfile() {
  /* const response = await api.get("/me");
  return response.data; */
  
  return {
    id: 1,
    name: 'teste'
  }
}
