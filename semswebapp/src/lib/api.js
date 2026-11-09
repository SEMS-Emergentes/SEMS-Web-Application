import axios from "axios";

// Flag de modo demo: hay que pedirlo. Encendido por defecto, un arranque sin
// .env servia datos inventados con aspecto de reales y un login que aceptaba
// cualquier credencial, sin mas aviso que una etiqueta pequena en la cabecera.
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const TOKEN_KEY = "sems-token";
const REFRESH_KEY = "sems-refresh";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// El token de acceso dura dos horas (security.jwt.expiration-minutes). El de
// refresco dura treinta dias y sirve para pedir uno nuevo sin volver a pedir
// la contrasena. La web lo descartaba al entrar, asi que a las dos horas el
// siguiente 401 echaba al usuario al login en medio de lo que estuviera
// haciendo; guardarlo tambien es lo que permite revocarlo al cerrar sesion.
export const refreshStore = {
  get: () => localStorage.getItem(REFRESH_KEY),
  set: (t) => (t ? localStorage.setItem(REFRESH_KEY, t) : localStorage.removeItem(REFRESH_KEY)),
  clear: () => localStorage.removeItem(REFRESH_KEY),
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

function cerrarSesionLocal() {
  tokenStore.clear();
  refreshStore.clear();
  if (!location.pathname.startsWith("/login")) location.href = "/login";
}

// Una sola renovacion en vuelo: cuando caduca el token suelen fallar varias
// peticiones a la vez (el panel pide lecturas, alertas y dispositivos juntos) y
// cada una pediria su propio token. El backend rota el de refresco en cada
// renovacion, asi que la segunda llegaria con uno ya gastado y cerraria la
// sesion que la primera acababa de salvar.
let renovacionEnVuelo = null;

function renovar() {
  if (renovacionEnVuelo) return renovacionEnVuelo;
  const refreshToken = refreshStore.get();
  if (!refreshToken) return Promise.reject(new Error("No hay token de refresco"));

  // Con axios pelado y no con `api`: una peticion de `api` volveria a pasar por
  // este interceptor y, si la renovacion responde 401, se llamaria a si misma.
  renovacionEnVuelo = axios
    .post(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken })
    .then(({ data }) => {
      tokenStore.set(data.token);
      refreshStore.set(data.refreshToken);
      return data.token;
    })
    .finally(() => {
      renovacionEnVuelo = null;
    });
  return renovacionEnVuelo;
}

// Si el backend responde 401, se intenta renovar el token una vez y repetir la
// peticion; solo si eso falla se cierra la sesion.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const peticion = error?.config;
    const esRenovable =
      error?.response?.status === 401 &&
      peticion &&
      !peticion._reintentada &&
      !peticion.url?.includes("/api/v1/auth/");

    if (!esRenovable) {
      if (error?.response?.status === 401) cerrarSesionLocal();
      return Promise.reject(error);
    }

    try {
      const token = await renovar();
      peticion._reintentada = true;
      peticion.headers = { ...peticion.headers, Authorization: `Bearer ${token}` };
      return api.request(peticion);
    } catch {
      cerrarSesionLocal();
      return Promise.reject(error);
    }
  }
);

// Pequeno helper para simular latencia en modo demo.
export const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));
