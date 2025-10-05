import axios from "axios";

const api = axios.create({
  baseURL: "https://allowing-killdeer-wise.ngrok-free.app/chat-messages/api",
  headers: {
    "ngrok-skip-browser-warning": 'true'

  },
});

export default api;