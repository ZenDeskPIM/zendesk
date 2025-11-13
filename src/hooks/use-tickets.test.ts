import { renderHook, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useTickets, computeSlaStatus, type Ticket } from "./use-tickets";

describe("useTickets", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
        localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("adds, updates and removes tickets while persisting to localStorage", () => {
        console.log("useTickets test executed");
        const { result } = renderHook(() => useTickets());

        let created: Ticket;
        act(() => {
            created = result.current.addTicket({
                titulo: "Falha no servidor",
                descricao: "Servidor reinicia sozinho",
                categoria: "Incidente",
                prioridade: "Alta",
                usuario: "alice",
                departamento: "T.I",
            });
        });

        expect(created!.id).toMatch(/^HD-2024-/);
        expect(result.current.tickets).toHaveLength(1);
        const stored = JSON.parse(localStorage.getItem("tickets") ?? "[]");
        expect(stored).toHaveLength(1);

        act(() => {
            result.current.updateTicket(created!.id, { status: "Resolvido" });
        });
        const updated = result.current.tickets.find((t) => t.id === created!.id)!;
        expect(updated.status).toBe("Resolvido");
        expect(new Date(updated.dataAtualizacao).getTime()).toBeGreaterThan(new Date("2024-01-01T00:00:00.000Z").getTime());

        act(() => {
            result.current.upsertTicketDetail({ id: created!.id, descricao: "Detalhado", prioridade: "Crítica" });
        });
        const detailed = result.current.tickets.find((t) => t.id === created!.id)!;
        expect(detailed.descricao).toBe("Detalhado");
        expect(detailed.prioridade).toBe("Crítica");
        expect(detailed.hasFullDetail).toBe(true);

        act(() => {
            result.current.upsertTicketDetail({ id: "remoto", titulo: "Novo" });
        });
        expect(result.current.tickets.find((t) => t.id === "remoto")).toBeTruthy();

        act(() => {
            result.current.removeTicket(created!.id);
        });
        expect(result.current.tickets.some((t) => t.id === created!.id)).toBe(false);

        act(() => {
            result.current.replaceAll([
                {
                    id: "HD-2024-0001",
                    titulo: "Chamado sincronizado",
                    descricao: "",
                    status: "Aberto",
                    prioridade: "Média",
                    categoria: "",
                    usuario: "bob",
                    departamento: "Financeiro",
                    dataCriacao: new Date().toISOString(),
                    dataAtualizacao: new Date().toISOString(),
                },
            ]);
        });
        expect(result.current.tickets).toHaveLength(1);
        expect(result.current.tickets[0].id).toBe("HD-2024-0001");
    });

    it("computes SLA status correctly", () => {
        const baseTicket: Ticket = {
            id: "1",
            titulo: "",
            descricao: "",
            status: "Aberto",
            prioridade: "Média",
            categoria: "",
            usuario: "",
            departamento: "T.I",
            dataCriacao: new Date().toISOString(),
            dataAtualizacao: new Date().toISOString(),
        };

        expect(computeSlaStatus(baseTicket).status).toBe("Normal");

        const overdueTicket = {
            ...baseTicket,
            slaVencimento: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        };
        expect(computeSlaStatus(overdueTicket).status).toBe("Vencido");

        const criticalTicket = {
            ...baseTicket,
            slaVencimento: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        };
        expect(computeSlaStatus(criticalTicket).status).toBe("Crítico");

        const normalTicket = {
            ...baseTicket,
            slaVencimento: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        };
        expect(computeSlaStatus(normalTicket).status).toBe("Normal");
    });
});
