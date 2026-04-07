import axios from "axios";

const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN || "rivo-dev-token-2026";

export const api = axios.create({
  baseURL: "/api",
  headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
});

export const get = (url, params) => api.get(url, { params }).then(r => r.data);
export const post = (url, data) => api.post(url, data).then(r => r.data);
export const put = (url, data) => api.put(url, data).then(r => r.data);
export const del = (url) => api.delete(url).then(r => r.data);
