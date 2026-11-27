import api from "./api";

export async function previewEmail(payload) {
  const response = await api.post("/email-preview/preview", payload);
  return response.data.data.preview;
}

export async function confirmEmail(payload) {
  const response = await api.post("/email-preview/confirm", payload);
  return response.data.data.confirmed;
}

export async function createEmailBatch(payload) {
  const response = await api.post("/email-batches", payload);
  return response.data.data;
}

export async function listEmailBatches(params = {}) {
  const response = await api.get("/email-batches", { params });
  return response.data.data;
}

export async function getEmailBatch(batchId) {
  const response = await api.get(`/email-batches/${batchId}`);
  return response.data.data.batch;
}

export async function cancelEmailBatch(batchId) {
  const response = await api.post(`/email-batches/${batchId}/cancel`);
  return response.data.data.batch;
}

export async function getEmailJob(batchId, jobKey) {
  const response = await api.get(`/email-batches/${batchId}/jobs/${jobKey}`);
  return response.data.data.job;
}
