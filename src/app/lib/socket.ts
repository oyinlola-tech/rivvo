import { io, Socket } from "socket.io-client";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

export const getSocket = (token?: string | null) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token: token || undefined },
    });
  }

  if (token) {
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};
