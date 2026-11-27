import api from "./api";

export async function listApplications(params = {}) {
  const response = await api.get("/applications", { params });
  return response.data.data;
}

export async function getApplication(applicationId) {
  const response = await api.get(`/applications/${applicationId}`);
  return response.data.data.application;
}

export async function createApplication(payload) {
  const response = await api.post("/applications", payload);
  return response.data.data.application;
}

export async function updateApplication(applicationId, payload) {
  const response = await api.patch(`/applications/${applicationId}`, payload);
  return response.data.data.application;
}

export async function deleteApplication(applicationId) {
  await api.delete(`/applications/${applicationId}`);
}
