import axios from "axios";

export const TOKEN_KEY = "rivo_auth_token";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export const get = (url, params) => api.get(url, { params }).then(r => r.data);
export const post = (url, data) => api.post(url, data).then(r => r.data);
export const put = (url, data) => api.put(url, data).then(r => r.data);
export const del = (url) => api.delete(url).then(r => r.data);
