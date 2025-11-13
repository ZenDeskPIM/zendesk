import type { Department } from "./departments";

/**
 * Heuristica simples para sugerir automaticamente o setor a partir do texto do ticket.
 * Utiliza palavras-chave ponderadas por departamento para sinalizar o setor mais provavel.
 */
type KeywordStrength = "strong" | "medium" | "weak";
type DepartmentKeywordConfig = Record<KeywordStrength, string[]>;

const KEYWORD_WEIGHTS: Record<KeywordStrength, number> = {
    strong: 4,
    medium: 2,
    weak: 1
};

const RAW_KEYWORDS: Record<string, DepartmentKeywordConfig> = {
    ti: {
        strong: [
            "setor tecnico",
            "suporte tecnico",
            "suporte ti",
            "helpdesk",
            "problema de rede",
            "rede fora do ar",
            "servidor fora do ar",
            "sistema fora do ar",
            "acesso bloqueado",
            "instabilidade no sistema"
        ],
        medium: [
            "ti",
            "tecnologia",
            "informatica",
            "computador",
            "computadores",
            "pc",
            "notebook",
            "notebooks",
            "laptop",
            "laptops",
            "desktop",
            "monitor",
            "monitores",
            "mouse",
            "mouses",
            "teclado",
            "teclados",
            "impressora",
            "impressoras",
            "periferico",
            "perifericos",
            "rede",
            "servidor",
            "servidores",
            "sistema",
            "sistemas",
            "software",
            "hardware",
            "vpn",
            "senha",
            "senhas",
            "login",
            "aplicacao",
            "aplicacoes",
            "licenca"
        ],
        weak: [
            "bug",
            "erro",
            "crash",
            "update",
            "atualizacao",
            "manutencao de sistema"
        ]
    },
    financeiro: {
        strong: [
            "contas a pagar",
            "contas a receber",
            "pagamento atrasado",
            "pagamento pendente",
            "boletos atrasados",
            "nota fiscal",
            "nf bloqueada",
            "aprovacao de pagamento",
            "centro de custo"
        ],
        medium: [
            "financeiro",
            "fatura",
            "faturas",
            "faturamento",
            "boleto",
            "boletos",
            "reembolso",
            "custos",
            "orcamento",
            "contabil",
            "contabilidade",
            "tesouraria",
            "fluxo de caixa",
            "darf",
            "imposto",
            "tributo",
            "pix",
            "transferencia bancaria"
        ],
        weak: [
            "adiantamento",
            "adiantamentos",
            "nota",
            "liquidacao",
            "relatorio financeiro"
        ]
    },
    rh: {
        strong: [
            "folha de pagamento",
            "processo seletivo",
            "recrutamento",
            "admissao",
            "demissao",
            "beneficios",
            "ferias",
            "vale transporte",
            "vale alimentacao",
            "cartao ponto",
            "gestao de pessoas"
        ],
        medium: [
            "rh",
            "recursos humanos",
            "folha",
            "beneficio",
            "holerite",
            "contratacao",
            "contratos de trabalho",
            "treinamento",
            "integracao",
            "ponto",
            "escala",
            "avaliacao",
            "clima organizacional"
        ],
        weak: [
            "funcionario",
            "funcionarios",
            "colaborador",
            "colaboradores",
            "time",
            "equipe",
            "pessoal"
        ]
    },
    producao: {
        strong: [
            "linha de producao",
            "linha parada",
            "maquina parada",
            "maquina quebrou",
            "parada de manutencao",
            "chao de fabrica",
            "fabrica parada",
            "ordem de producao",
            "setup de maquina",
            "pcp"
        ],
        medium: [
            "producao",
            "maquina",
            "maquinas",
            "equipamento",
            "equipamentos",
            "manutencao",
            "manutencoes",
            "industrial",
            "estoque",
            "almoxarifado",
            "logistica interna",
            "operacao",
            "operacoes",
            "operador",
            "qualidade",
            "embalagem"
        ],
        weak: [
            "linha",
            "turno",
            "turnos",
            "planta",
            "galpao",
            "producao de serie"
        ]
    }
};

const KEYWORD_TABLE: Record<string, DepartmentKeywordConfig> = Object.fromEntries(
    Object.entries(RAW_KEYWORDS).map(([department, config]) => {
        const normalized: Partial<DepartmentKeywordConfig> = {};
        (Object.keys(KEYWORD_WEIGHTS) as KeywordStrength[]).forEach((strength) => {
            normalized[strength] = (config[strength] ?? [])
                .map((keyword) => normalizeKeyword(keyword))
                .filter(Boolean);
        });
        return [department, normalized as DepartmentKeywordConfig];
    })
);

function normalize(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function normalizeKeyword(keyword: string): string {
    return normalize(keyword).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeDepartmentName(name: string): string {
    return normalize(name).replace(/[^a-z0-9]/g, "");
}

function tokenize(text: string): { tokens: Set<string>; flat: string } {
    const normalized = normalize(text).replace(/[^a-z0-9\s]/g, " ");
    const flat = normalized.replace(/\s+/g, " ").trim();
    const tokens = new Set(flat.split(" ").filter(Boolean));
    return { tokens, flat };
}

function scoreDepartment(flat: string, tokens: Set<string>, config: DepartmentKeywordConfig): number {
    let score = 0;
    (Object.keys(KEYWORD_WEIGHTS) as KeywordStrength[]).forEach((strength) => {
        const keywords = config[strength] ?? [];
        const weight = KEYWORD_WEIGHTS[strength];
        for (const keyword of keywords) {
            if (!keyword) continue;
            if (keyword.includes(" ")) {
                if (flat.includes(keyword)) {
                    score += weight * 2;
                }
                continue;
            }
            if (tokens.has(keyword)) {
                score += weight;
                continue;
            }
            if (keyword.endsWith("s") && tokens.has(keyword.slice(0, -1))) {
                score += Math.max(1, weight - 1);
                continue;
            }
            if (!keyword.endsWith("s") && tokens.has(`${keyword}s`)) {
                score += Math.max(1, weight - 1);
            }
        }
    });
    return score;
}

export function guessDepartmentFromText(
    title: string,
    description: string,
    departments: Department[]
): Department | null {
    if (!departments.length) return null;
    const raw = `${title} ${description}`.trim();
    if (!raw) return null;

    const { tokens, flat } = tokenize(raw);

    let bestMatch: { dept: Department; score: number } | null = null;

    for (const dept of departments) {
        const normalizedDeptName = normalizeDepartmentName(dept.name);
        const config = KEYWORD_TABLE[normalizedDeptName];
        if (!config) continue;

        let score = scoreDepartment(flat, tokens, config);
        if (tokens.has(normalizedDeptName)) {
            score += 6; // mencao direta ao nome do departamento
        }

        if (!bestMatch || score > bestMatch.score) {
            bestMatch = { dept, score };
        }
    }

    if (!bestMatch || bestMatch.score <= 0) {
        return null;
    }

    return bestMatch.dept;
}

