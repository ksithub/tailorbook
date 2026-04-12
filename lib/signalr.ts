import * as signalR from "@microsoft/signalr";

const hubUrl =
  process.env.NEXT_PUBLIC_SIGNALR_URL ?? `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5012"}/hubs/kanban`;

export function createKanbanConnection() {
  const token = typeof window !== "undefined" ? localStorage.getItem("tb_access") : null;
  return new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => token ?? "",
      skipNegotiation: false,
      transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect()
    .build();
}
