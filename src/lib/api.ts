/**
 * Cliente HTTP central do frontend (Axios) e utilitários de autenticação.
 *
 * Objetivos
 * - Expor uma instância Axios configurada com baseURL e JSON headers.
 * - Injetar automaticamente o token JWT no header Authorization.
 * - Tratar 401 para limpar token e deixar o fluxo de login assumir.
 * - Logar requisições/respostas no modo Android para depuração.
 */
import axios, { AxiosHeaders } from "axios";

const FALLBACK_API_URL = (() => {
    if (import.meta.env.MODE === "android") return "http://10.0.2.2:5140/api";
    return "http://localhost:5140/api";
})();

const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const API_URL = configuredApiUrl || FALLBACK_API_URL;

if (!configuredApiUrl) {
    console.warn("VITE_API_URL is not set. Falling back to", API_URL);
}

// Helpful at runtime (especially in Android/Electron builds) to confirm which base URL is in use
if (import.meta.env.MODE === "android" || import.meta.env.MODE === "electron") {
    console.info(`[${import.meta.env.MODE}] Using API URL:`, API_URL);
}

/** Chave usada no localStorage para persistir o token JWT */
export const TOKEN_STORAGE_KEY = "auth_token";

/** Obtém o token JWT do localStorage (ou null em caso de erro/ausência) */
export function getToken(): string | null {
    try {
        return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
        return null;
    }
}

/** Define ou remove o token JWT do localStorage de forma segura */
export function setToken(token: string | null) {
    try {
        if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
        else localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
        // ignore
    }
}

/** Instância Axios padrão do app */
export const api = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 6000,
});

// Interceptor de request: injeta Authorization: Bearer <token>
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        if (!config.headers) config.headers = new AxiosHeaders();
        (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
    }
    return config;
});

// Interceptor de response: logging no Android e limpeza em 401
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        if (import.meta.env.MODE === "android") {
            console.error("[Android] API error:", {
                message: error?.message,
                status: error?.response?.status,
                url: error?.config?.baseURL ? `${error?.config?.baseURL}${error?.config?.url ?? ""}` : error?.config?.url,
                method: error?.config?.method,
                data: error?.config?.data,
            });
        }
        if (error?.response?.status === 401) {
            // Token expirado ou inválido; limpe e deixe fluxo de login cuidar
            setToken(null);
        }
        return Promise.reject(error);
    }
);

// Extra request logging only on Android builds to help debug networking
if (import.meta.env.MODE === "android") {
    api.interceptors.request.use((config) => {
        console.info("[Android] API request:", {
            method: config.method,
            url: config.baseURL ? `${config.baseURL}${config.url ?? ""}` : config.url,
        });
        return config;
    });
}

export type ApiResponse<T> = {
    message?: string;
    data: T;
};
