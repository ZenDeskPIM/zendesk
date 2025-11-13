import type { Department } from "./departments";

/**
 * Heuristica simples para sugerir automaticamente o setor a partir do texto do ticket.
 * Utiliza palavras-chave por departamento para sinalizar o setor mais provavel.
 */
const RAW_KEYWORDS: Record<string, string[]> = {
  ti: [
    "ti",
    "tecnologia",
    "informatica",
    "computador",
    "computadores",
    "pc",
    "impressora",
    "impressoras",
    "rede",
    "servidor",
    "servidores",
    "sistema",
    "sistemas",
    "software",
    "hardware",
    "acesso",
    "senha",
    "senhas",
    "login",
    "vpn",
    "email",
    "emails",
    "periferico",
    "perifericos",
    "bug",
    "erro",
    "crash",
    "update",
    "atualizacao",
    "licenca"
  ],
  financeiro: [
    "financeiro",
    "pagamento",
    "pagamentos",
    "fatura",
    "faturas",
    "faturamento",
    "boleto",
    "boletos",
    "nota fiscal",
    "nf",
    "reembolso",
    "custos",
    "orcamento",
    "contabil",
    "contabilidade",
    "receber",
    "pagar",
    "tributo",
    "imposto"
  ],
  rh: [
    "rh",
    "recursos humanos",
    "folha",
    "folha pagamento",
    "beneficio",
    "beneficios",
    "ferias",
    "admissao",
    "demissao",
    "colaborador",
    "colaboradores",
    "funcionario",
    "funcionarios",
    "holerite",
    "ponto",
    "cartao ponto",
    "vale",
    "recrutamento"
  ],
  producao: [
    "producao",
    "linha producao",
    "linha",
    "maquina",
    "maquinas",
    "equipamento",
    "equipamentos",
    "manutencao",
    "manutencoes",
    "operacao",
    "operacoes",
    "chao fabrica",
    "fabrica",
    "industrial",
    "estoque",
    "insumo",
    "insumos",
    "materia prima"
  ]
};

const KEYWORD_TABLE: Record<string, string[]> = Object.fromEntries(
  Object.entries(RAW_KEYWORDS).map(([department, keywords]) => [
    department,
    keywords.map((keyword) => normalizeKeyword(keyword)).filter(Boolean)
  ])
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

function scoreDepartment(flat: string, tokens: Set<string>, keywords: string[]): number {
  let score = 0;
  for (const keyword of keywords) {
    if (!keyword) continue;
    if (keyword.includes(" ")) {
      if (flat.includes(keyword)) {
        score += 2;
      }
      continue;
    }
    if (tokens.has(keyword)) {
      score += 2;
      continue;
    }
    if (keyword.endsWith("s") && tokens.has(keyword.slice(0, -1))) {
      score += 1;
      continue;
    }
    if (!keyword.endsWith("s") && tokens.has(`${keyword}s`)) {
      score += 1;
    }
  }
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
    const keywords = KEYWORD_TABLE[normalizedDeptName];
    if (!keywords) continue;

    let score = scoreDepartment(flat, tokens, keywords);
    if (tokens.has(normalizedDeptName)) {
      score += 3; // mencao direta ao nome do departamento
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
