import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => {
    return {
        api: {
            post: vi.fn(),
        },
    };
});

import { api } from "./api";
import { analyzeTicket } from "./ai";

describe("analyzeTicket", () => {
    it("sends request payload and returns parsed data", async () => {
        const payload = {
            suggestions: ["Resetar modem"],
            predictedDepartmentId: 1,
        };
        vi.mocked(api.post).mockResolvedValue({ data: { data: payload } });

        const request = { title: "Sem internet", description: "Ponto sem conexão" };
        const result = await analyzeTicket(request);

        expect(api.post).toHaveBeenCalledWith("/ai/analyze", request);
        expect(result).toEqual(payload);
    });
});
