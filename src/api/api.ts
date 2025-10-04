import axios from "axios";

const api = axios.create({
  baseURL: "https://allowing-killdeer-wise.ngrok-free.app/chat-messages/api",
});

export default api;