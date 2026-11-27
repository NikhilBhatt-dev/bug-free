import api from "./api";

export async function getGmailStatus() {
  const response = await api.get("/gmail/status");
  return response.data.data.connection;
}

export async function getAnalyticsSummary() {
  const response = await api.get("/analytics/summary");
  return response.data.data.summary;
}
