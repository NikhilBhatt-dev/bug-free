import api from "./api";

export async function getSendingSettings() {
  const response = await api.get("/user-settings/sending");
  return response.data.data.settings;
}

export async function updateSendingSettings(payload) {
  const response = await api.put("/user-settings/sending", payload);
  return response.data.data.settings;
}
