import api from "./api";

export function getGoogleLoginUrl() {
  return `${api.defaults.baseURL}/auth/google`;
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data.user;
}

export async function logout() {
  await api.post("/auth/logout");
}
