import api from "./api";

export async function listCvs() {
  const response = await api.get("/cvs");
  return response.data.data.cvs;
}

export async function uploadCv(category, file, onUploadProgress) {
  const form = new FormData();
  form.append("category", category);
  form.append("file", file);
  const response = await api.post("/cvs", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });
  return response.data.data.cv;
}

export async function getCvAccessUrl(cvId) {
  const response = await api.get(`/cvs/${cvId}/access`);
  return response.data.data.url;
}

export async function deleteCv(cvId) {
  await api.delete(`/cvs/${cvId}`);
}
