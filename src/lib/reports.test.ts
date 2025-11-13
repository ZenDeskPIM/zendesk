import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
    api: {
        get: vi.fn(),
    },
}));

import { api } from "./api";
import { getReportsSummary } from "./reports";

describe("getReportsSummary", () => {
    it("normalises the backend payload", async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: {
                Data: {
                    Period: "mensal",
                    TotalTickets: 10,
                    Resolved: 7,
                    Pending: 3,
                    AvgResolutionHours: 12,
                    Departments: { "T.I": 5, Financeiro: 5 },
                    Priorities: { Crítica: 1, Alta: 3, Média: 4, Baixa: 2 },
                    DepartmentsDetailed: [
                        { Department: "T.I", Total: 5, Resolved: 4, Pending: 1 },
                    ],
                },
            },
        });

        const summary = await getReportsSummary("mensal");
        expect(api.get).toHaveBeenCalledWith("/reports/summary", { params: { period: "mensal" } });
        expect(summary.totalTickets).toBe(10);
        expect(summary.departmentsDetailed?.[0]).toEqual({ department: "T.I", total: 5, resolved: 4, pending: 1 });
    });
});
