import api from "./api";

export async function listTemplates() {
  const response = await api.get("/email-templates");
  return response.data.data.templates;
}

export async function createTemplate(payload) {
  const response = await api.put("/email-templates", payload);
  return response.data.data.template;
}

export async function updateTemplate(templateId, payload) {
  const response = await api.patch(`/email-templates/${templateId}`, payload);
  return response.data.data.template;
}

export async function deleteTemplate(templateId) {
  await api.delete(`/email-templates/${templateId}`);
}
