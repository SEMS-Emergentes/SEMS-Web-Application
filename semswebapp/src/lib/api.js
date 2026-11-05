import axios from "axios";

// Flag de modo demo: hay que pedirlo. Encendido por defecto, un arranque sin
// .env servia datos inventados con aspecto de reales y un login que aceptaba
// cualquier credencial, sin mas aviso que una etiqueta pequena en la cabecera.
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const TOKEN_KEY = "sems-token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Instancia de axios apuntando al backend.
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Agrega el JWT a cada peticion.
const SEND_AUTH = true;
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (SEND_AUTH && token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el backend responde 401, limpiamos sesion y vamos al login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      tokenStore.clear();
      if (!location.pathname.startsWith("/login")) location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Pequeno helper para simular latencia en modo demo.
export const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));
