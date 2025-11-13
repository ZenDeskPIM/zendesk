import { describe, it, expect, beforeEach } from "vitest";
import { AxiosHeaders } from "axios";
import { api, getToken, setToken, TOKEN_STORAGE_KEY } from "./api";

describe("api utilities", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("persists and retrieves JWT tokens", () => {
        expect(getToken()).toBeNull();
        setToken("abc123");
        expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("abc123");
        expect(getToken()).toBe("abc123");
        setToken(null);
        expect(getToken()).toBeNull();
    });

    it("injects Authorization header when token exists", async () => {
        setToken("with-header");
        const handler = (api.interceptors.request as any).handlers[0].fulfilled;
        const config = handler({ headers: new AxiosHeaders() });
        expect(config.headers.get("Authorization")).toBe("Bearer with-header");
    });

    it("clears token on 401 responses", async () => {
        setToken("expired");
        const handler = (api.interceptors.response as any).handlers[0].rejected;
        await expect(
            handler({ response: { status: 401 }, config: {} })
        ).rejects.toBeDefined();
        expect(getToken()).toBeNull();
    });
});
