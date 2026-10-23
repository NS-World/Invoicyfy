import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost/invoice-api/";

export const tokenStore = {
  get access() {
    return localStorage.getItem("token");
  },
  get refresh() {
    return localStorage.getItem("refresh_token");
  },
  set(access, refresh) {
    if (access) localStorage.setItem("token", access);
    if (refresh) localStorage.setItem("refresh_token", refresh);
  },
  clear() {
    ["token", "refresh_token", "user", "lastActivityTime"].forEach((k) => localStorage.removeItem(k));
  },
};

/** Khanak SaaS: the shop code chosen at login (empty on a single-shop install). Sent with every API call. */
export const shopStore = {
  get code() {
    try {
      return localStorage.getItem("khanakShop") || "";
    } catch {
      return "";
    }
  },
  set(code) {
    try {
      if (code) localStorage.setItem("khanakShop", code);
      else localStorage.removeItem("khanakShop");
    } catch {
      /* storage blocked */
    }
  },
};
const shopHeader = () => (shopStore.code ? { "X-Tenant": shopStore.code } : {});

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

API.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (shopStore.code && !config.headers["X-Tenant"]) config.headers["X-Tenant"] = shopStore.code;
  return config;
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) throw new Error("No refresh token");
  const res = await axios.post(`${API_BASE_URL}auth/refresh.php`, { refresh_token: refreshToken }, { headers: shopHeader() });
  if (res.data?.status !== "success" || !res.data?.access_token) throw new Error("Token refresh failed");
  tokenStore.set(res.data.access_token, res.data.refresh_token);
  if (res.data.user) localStorage.setItem("user", JSON.stringify(res.data.user));
  return res.data.access_token;
};

const sessionExpired = () => {
  tokenStore.clear();
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login?expired=1";
  }
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes("auth/signin") || original?.url?.includes("auth/refresh");
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        // Share one refresh between all requests that failed at the same time.
        refreshPromise = refreshPromise || refreshAccessToken().finally(() => (refreshPromise = null));
        const token = await refreshPromise;
        original.headers.Authorization = `Bearer ${token}`;
        return API(original);
      } catch (refreshError) {
        // No connection is not an expired session: keep the user signed in (offline billing keeps working).
        if (refreshError?.response || refreshError?.message === "No refresh token" || refreshError?.message === "Token refresh failed") sessionExpired();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

/** Build a query string, skipping empty values. */
export const qs = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") search.append(k, v);
  });
  const s = search.toString();
  return s ? `?${s}` : "";
};

export default API;
