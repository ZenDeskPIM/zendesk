#!/usr/bin/env node
import axios from "axios";

const API_URL = process.env.API_URL ?? "http://localhost:5140/api";
const API_EMAIL = process.env.API_EMAIL ?? "admin@ticketsystem.com";
const API_PASSWORD = process.env.API_PASSWORD ?? "admin123";
const DEFAULT_TICKET_COUNT = 54;
const TOTAL_TO_CREATE = Number.parseInt(process.env.TICKET_COUNT ?? String(DEFAULT_TICKET_COUNT), 10);

if (!Number.isFinite(TOTAL_TO_CREATE) || TOTAL_TO_CREATE <= 0) {
    console.error(`Quantidade inválida em TICKET_COUNT: ${process.env.TICKET_COUNT}`);
    process.exit(1);
}

const client = axios.create({
    baseURL: API_URL,
    timeout: 15_000,
    headers: {
        "Content-Type": "application/json",
    },
});

const priorities = ["Urgent", "High", "Normal", "Low"];
const statuses = [
    "Open",
    "InProgress",
    "Pending",
    "WaitingCustomer",
    "WaitingAgent",
    "Resolved",
    "Closed",
    "Cancelled",
];
const categories = [
    {
        label: "Hardware",
        issues: [
            "Impressora laser travada",
            "Desktop sem vídeo",
            "Monitor piscando",
            "Servidor com disco em alerta",
        ],
    },
    {
        label: "Software",
        issues: [
            "ERP não sincroniza pedidos",
            "Aplicativo mobile fecha sozinho",
            "Atualização do Windows falhou",
            "Erro 500 ao acessar portal interno",
        ],
    },
    {
        label: "Periféricos",
        issues: [
            "Scanner não reconhecido",
            "Mouse com cliques duplos involuntários",
            "Headset sem áudio",
            "Webcam com imagem invertida",
        ],
    },
    {
        label: "Acessos",
        issues: [
            "Reativar usuário bloqueado",
            "Reset de MFA corporativo",
            "Provisionar acesso ao SharePoint",
            "VPN desconecta após login",
        ],
    },
];
const descriptions = [
    "Ticket gerado automaticamente para teste de carga das integrações.",
    "Criado via script de verificação end-to-end para validar o fluxo da API.",
    "Registrar chamados em volume para medir desempenho e consistência de dados.",
    "Esse chamado faz parte do lote de homologação para verificar SLAs.",
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function login() {
    console.log(`→ Realizando login em ${API_URL} como ${API_EMAIL}`);
    const response = await client.post("/auth/login", {
        email: API_EMAIL,
        password: API_PASSWORD,
    });
    const token = response?.data?.data?.token;
    if (!token) {
        throw new Error("Token não retornado pela API de login");
    }
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
    console.log("✔ Login efetuado com sucesso");
}

async function fetchDepartments() {
    console.log("→ Obtendo departamentos disponíveis");
    const response = await client.get("/departments");
    const departments = response?.data?.data ?? [];
    if (!Array.isArray(departments) || departments.length === 0) {
        throw new Error("Nenhum departamento encontrado na API");
    }
    console.log(`✔ ${departments.length} departamentos carregados`);
    return departments;
}

function composeSubject(index, batchTimestamp) {
    const category = categories[index % categories.length];
    const issueList = category.issues;
    const issue = issueList[index % issueList.length];
    const suffix = String(index + 1).padStart(2, "0");
    return `[${category.label}] ${issue} - Lote ${batchTimestamp} #${suffix}`;
}

async function updateTicketStatus(dbId, targetStatus) {
    if (!dbId || !targetStatus || targetStatus === "Open") return;
    await client.put(`/tickets/${dbId}/status`, { NewStatus: targetStatus });
}

async function createTickets(departments) {
    console.log(`→ Iniciando criação de ${TOTAL_TO_CREATE} tickets`);
    const results = [];
    const batchTimestamp = new Date().toISOString().replace(/[:.]/g, "");

    for (let index = 0; index < TOTAL_TO_CREATE; index += 1) {
        const department = departments[index % departments.length];
        const priority = priorities[index % priorities.length];
        const category = categories[index % categories.length];
        const subject = composeSubject(index, batchTimestamp);
        const description = `${pickRandom(descriptions)}\nCategoria simulada: ${category.label}\nLote: ${batchTimestamp}\nSequência: ${index + 1}`;
        const targetStatus = statuses[index % statuses.length];

        try {
            const response = await client.post("/tickets", {
                subject,
                description,
                priority,
                departmentId: department.id,
            });
            const ticketId = response?.data?.data?.id;
            if (!ticketId) {
                throw new Error("API não retornou o identificador do ticket criado");
            }

            await updateTicketStatus(ticketId, targetStatus).catch((error) => {
                const status = error?.response?.status ?? "?";
                console.warn(`⚠ Falha ao ajustar status de ticket ${ticketId} para ${targetStatus} (status ${status})`);
            });

            console.log(`✔ Ticket ${index + 1}/${TOTAL_TO_CREATE} criado (${priority} - ${department.name} - ${targetStatus})`);
            results.push(true);
        } catch (error) {
            const status = error?.response?.status ?? "?";
            console.error(`✖ Falha ao criar ticket ${index + 1}/${TOTAL_TO_CREATE} (status ${status})`);
            if (error?.response?.data) {
                console.error(JSON.stringify(error.response.data));
            } else {
                console.error(error?.message ?? error);
            }
            results.push(false);
        }

        // Pequena pausa para não sobrecarregar o backend em ambientes locais
        await wait(150);
    }

    const sucesso = results.filter(Boolean).length;
    const falhas = TOTAL_TO_CREATE - sucesso;
    console.log(`→ Resultado: ${sucesso} tickets criados, ${falhas} falhas.`);
    if (falhas > 0) {
        throw new Error("Nem todos os tickets foram criados com sucesso");
    }
}

async function main() {
    try {
        await login();
        const departments = await fetchDepartments();
        await createTickets(departments);
        console.log("✔ Teste de carga concluído com sucesso");
    } catch (error) {
        console.error("✖ Erro durante o teste de carga:");
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

await main();
