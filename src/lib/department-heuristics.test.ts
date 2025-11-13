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

    it("detects T.I when user menciona suporte tecnico", () => {
        const result = guessDepartmentFromText(
            "Meu mouse esta travando",
            "Preciso que o setor tecnico troque o mouse e ajuste o monitor",
            baseDepartments
        );
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

    it("detects contas a pagar scenario for Financeiro", () => {
        const result = guessDepartmentFromText(
            "Urgencia na aprovacao",
            "Contas a pagar precisa liberar pagamento pendente e revisar centro de custo",
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

    it("detects producao context from machine stoppage", () => {
        const result = guessDepartmentFromText(
            "Maquina da fabrica parou",
            "Linha de producao parada no turno da noite aguardando manutencao",
            baseDepartments
        );
        expect(result?.name).toBe("Producao");
    });

    it("returns null when nothing matches", () => {
        const result = guessDepartmentFromText(
            "Solicitacao generica",
            "Sem detalhes especificos sobre area ou departamento",
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
