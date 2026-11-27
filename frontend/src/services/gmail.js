import api from "./api";

export async function getGmailStatus() {
  const response = await api.get("/gmail/status");
  return response.data.data.connection;
}

export async function startGmailConnection() {
  const response = await api.get("/gmail/connect");
  return response.data.data.authorizationUrl;
}

export async function disconnectGmail() {
  await api.post("/gmail/disconnect");
}
