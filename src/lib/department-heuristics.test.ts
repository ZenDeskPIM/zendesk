import { describe, expect, it } from "vitest";

import type { Department } from "./departments";
import { guessDepartmentFromText } from "./department-heuristics";

const baseDepartments: Department[] = [
  { id: 1, name: "T.I" },
  { id: 2, name: "Financeiro" },
  { id: 3, name: "RH" },
  { id: 4, name: "Producao" }
];

describe("guessDepartmentFromText", () => {
  it("prioritizes T.I keywords", () => {
    const text = "Computador travando com erro de login e falha de rede";
    const result = guessDepartmentFromText(text, "", baseDepartments);
    expect(result?.name).toBe("T.I");
  });

  it("detects financeiro context", () => {
    const result = guessDepartmentFromText(
      "",
      "Boleto com pagamento em atraso e nota fiscal bloqueada",
      baseDepartments
    );
    expect(result?.name).toBe("Financeiro");
  });

  it("detects RH terms even with composed phrases", () => {
    const result = guessDepartmentFromText(
      "Solicitacao sobre folha de pagamento e beneficios",
      "Colaborador sem receber o vale",
      baseDepartments
    );
    expect(result?.name).toBe("RH");
  });

  it("normalizes accents when checking Producao", () => {
    const result = guessDepartmentFromText(
      "Falha de máquina na produção",
      "Linha de produção parada aguardando manutenção",
      baseDepartments
    );
    expect(result?.name).toBe("Producao");
  });

  it("returns null when nothing matches", () => {
    const result = guessDepartmentFromText(
      "Solicitacao generica",
      "Sem detalhes tecnicos ou operacionais",
      baseDepartments
    );
    expect(result).toBeNull();
  });

  it("ignores departments that are not in the provided list", () => {
    const customDepartments: Department[] = [
      { id: 9, name: "Financeiro" }
    ];
    const result = guessDepartmentFromText(
      "Computador sem acesso",
      "Rede indisponivel",
      customDepartments
    );
    expect(result).toBeNull();
  });
});
