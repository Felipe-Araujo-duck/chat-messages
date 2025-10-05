import * as signalR from "@microsoft/signalr";

let connection: signalR.HubConnection | null = null;

export function createConnection(userId: string) {
  connection = new signalR.HubConnectionBuilder()
    .withUrl(`https://allowing-killdeer-wise.ngrok-free.app/chat-messages/api/chat-hub?userId=${userId}`)
    .withAutomaticReconnect()
    .build();

  // Eventos recebidos do servidor
  connection.on("NotifyReceiver", (creatorUserId: number, chatId: number) => {
    console.log(`[Sistema] Solicitação de chat do usuário ${creatorUserId} para o chat ${chatId}.`);
  });

  connection.on("NotificationAccepted", () => {
    console.log("[Sistema] Chat aceito pelo outro usuário.");
  });

  connection.on("NotificationRefused", () => {
    console.log("[Sistema] Chat recusado pelo outro usuário.");
  });

  connection.on("ReceiveMessage", (senderUserId: string, message: string) => {
    console.log(`[Mensagem de ${senderUserId}] ${message}`);
  });

  return connection;
}

export async function startConnection(userId: string) {
  if (connection && connection.state === signalR.HubConnectionState.Connected)
    return connection;

  connection = createConnection(userId);

  try {
    await connection.start();
  } catch (err) {
    console.error("Erro ao conectar SignalR:", err);
  }

  return connection;
}

export function getConnection() {
  return connection;
}

export function stopConnection() {
  if (connection) {
    connection.stop();
    connection = null;
  }
}

export async function joinChat(userId: number, targetId: number, chatId?: number, accepted?: boolean) {
  if (!connection) throw new Error("Conexão não iniciada");

  await connection.invoke(
    "JoinChat",
    userId,
    targetId,
    chatId ?? 0,
    accepted ?? false
  );
}

export async function sendMessage(chatId: number, message: string) {
  if (!connection) throw new Error("Conexão não iniciada");
  if (connection.state !== signalR.HubConnectionState.Connected)
    throw new Error("Conexão com o servidor não está ativa!");

  await connection.send("SendMessage", chatId, message);
}

export async function registerPublicKey(publicKey: string, chatId: number) {
  if (!connection) throw new Error("Conexão não iniciada");

  await connection.invoke("RegisterPublicKey", publicKey, chatId);
}

export async function getPublicKeys(chatId: number) {
  if (!connection) throw new Error("Conexão não iniciada");

  const keys = await connection.invoke<{ userId: number; publicKey: string }[]>(
    "GetPublicKey",
    chatId
  );

  return keys;
}
