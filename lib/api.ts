import axios, { AxiosError } from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5012";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("tb_access");
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

// Handle 401 → redirect to login, surface API error messages
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: string; errors?: string[] }>) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("tb_access");
      localStorage.removeItem("tb_refresh");
      // Only redirect if not already on auth pages
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register")) {
        window.location.href = "/login";
      }
    }
    // Repackage the API error message so callers can display it
    const apiError = err.response?.data?.error
      ?? err.response?.data?.errors?.join(", ")
      ?? err.message;
    return Promise.reject(new Error(apiError));
  }
);
