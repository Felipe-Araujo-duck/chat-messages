import * as signalR from "@microsoft/signalr";

let connection: signalR.HubConnection | null = null;

export function createConnection(userId: string) {
  connection = new signalR.HubConnectionBuilder()
    .withUrl(`https://allowing-killdeer-wise.ngrok-free.app/chat-messages/api/chat-hub?userId=${userId}`, {
      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets
    })
    .withAutomaticReconnect()
    .build();

  connection.on("NotifyReceiver", (creatorUserId: number, chatId: number) => {
    console.log(
      `[Sistema] Notificação de solicitação de chat do usuário ${creatorUserId} para o chat ${chatId}...`
    );
  });

  connection.on("NotificationAccepted", () => {
    console.log("[Sistema] Chat aceito pelo outro usuário.");
  });

  connection.on("NotificationRefused", () => {
    console.log("[Sistema] Chat recusado pelo outro usuário.");
  });

  connection.on("ReceiveMessage", (senderUserId: string, message: string) => {
    console.log(`[Mensagem de UserId: ${senderUserId}] ${message}`);
  });

  return connection;
}

export async function startConnection(userId: string) {
  if (connection) return connection; // já existe

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
