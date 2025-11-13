import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
    api: {
        get: vi.fn(),
    },
}));

import { api } from "./api";
import { listDepartments } from "./departments";

describe("listDepartments", () => {
    it("fetches departments and unwraps data", async () => {
        const departments = [{ id: 1, name: "Financeiro" }];
        vi.mocked(api.get).mockResolvedValue({ data: { data: departments } });

        const result = await listDepartments();
        expect(api.get).toHaveBeenCalledWith("/departments");
        expect(result).toEqual(departments);
    });
});
