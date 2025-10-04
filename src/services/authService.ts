import api from "../api/api";
import type { User } from "../auth/authContext";

export async function login(name: string, password: string): Promise<User> {
  const response = await api.post<User>("/Auth/login", { name, password });
  const user = response.data;

  if(user)
    localStorage.setItem("user", JSON.stringify(user));

  return user;
}

export async function register(name: string, password: string) {
  const response = await api.post("/Auth/register", { name, password });
  return response.data;
}

export async function logout() {
  localStorage.clear();
}

export function getProfile(): User | null {
  const userJson = localStorage.getItem("user");

  if (!userJson) {
    return null; 
  }

  try {
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
}
