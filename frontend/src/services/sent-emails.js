import api from "./api";

export async function listSentEmails(params = {}) {
  const response = await api.get("/sent-emails", { params });
  return response.data.data;
}

export async function getSentEmail(sentEmailId) {
  const response = await api.get(`/sent-emails/${sentEmailId}`);
  return response.data.data.sentEmail;
}
