/**
 * Funções de acesso à API de usuários.
 *
 * Responsabilidades:
 * - Listar usuários (geral) e clientes (segmentado).
 * - Criar usuário com payload adaptado conforme tipo (Customer, Agent, Admin).
 *
 * Observações:
 * - Paginação padrão: page=1, pageSize=50 se não especificado.
 * - Parâmetro q (query) é opcional e repassado como filtro de busca.
 */
import { api, ApiResponse } from "./api";

/** Tipos válidos de usuários retornados pelo backend */
export type UserType = "Customer" | "Agent" | "Admin" | string | number;

/** Representação de um usuário vinda da API */
export type ApiUser = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    userType: UserType;
    isActive: boolean;
    lastLoginAt?: string | null;
    fullName: string;
    specialization?: string | null; // Agent
    level?: number | null; // Agent
    isAvailable?: boolean | null; // Agent
    department?: string | null; // Customer
};

/** Formato padrão de resposta paginada da API */
export type ApiListResponse<T> = {
    message?: string;
    data: { total: number; page: number; pageSize: number; items: T[] };
};

/** Lista usuários (todos os tipos). */
export async function listUsers(params?: { page?: number; pageSize?: number; q?: string }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const q = params?.q ?? undefined;
    const res = await api.get<ApiListResponse<ApiUser>>("/users", { params: { page, pageSize, q } });
    return res.data.data;
}

/**
 * Conta usuários ativos.
 * Estratégia: paginação progressiva enquanto houver páginas a percorrer ou até atingir limite de segurança.
 * Usa pageSize grande para reduzir chamadas. Se backend crescer muito, migrar para endpoint dedicado.
 */
export async function countActiveUsers(): Promise<number> {
    let page = 1;
    const pageSize = 100;
    let totalActive = 0;
    let total = 0;
    const SAFETY_MAX_PAGES = 20; // evita loops infinitos
    while (page <= SAFETY_MAX_PAGES) {
        const res = await api.get<ApiListResponse<ApiUser>>("/users", { params: { page, pageSize } });
        const data = res.data.data;
        if (page === 1) total = data.total;
        totalActive += data.items.filter(u => u.isActive).length;
        const fetched = page * pageSize;
        if (fetched >= total) break;
        page++;
    }
    return totalActive;
}

/** Lista apenas usuários do tipo Customer. */
export async function listCustomers(params?: { page?: number; pageSize?: number; q?: string }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const q = params?.q ?? undefined;
    const res = await api.get<ApiListResponse<ApiUser>>("/users/customers", { params: { page, pageSize, q } });
    return res.data.data;
}

/** Cria um novo usuário conforme tipo e retorna o objeto criado. */
export async function createUser(input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    userType: "Customer" | "Agent" | "Admin";
    department?: string; // Customer
    specialization?: string; // Agent
    level?: number; // Agent
    isAvailable?: boolean; // Agent
    isActive?: boolean;
}) {
    const res = await api.post<ApiResponse<ApiUser>>("/users", input);
    return res.data.data;
}

/** Obtém usuário por ID (admin only). */
export async function getUserById(id: number) {
    const res = await api.get<ApiResponse<ApiUser>>(`/users/${id}`);
    return res.data.data;
}

/** Atualiza usuário existente. */
export async function updateUser(id: number, input: {
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
    password?: string;
    department?: string;
    specialization?: string;
    level?: number;
    isAvailable?: boolean;
}) {
    const res = await api.put<ApiResponse<ApiUser>>(`/users/${id}`, input);
    return res.data.data;
}

/** Atualiza apenas o status ativo/inativo. */
export async function setUserStatus(id: number, isActive: boolean) {
    const res = await api.patch<ApiResponse<ApiUser>>(`/users/${id}/status`, { isActive });
    return res.data.data;
}

/** Remove (soft delete) um usuário. */
export async function deleteUser(id: number) {
    await api.delete(`/users/${id}`);
}
