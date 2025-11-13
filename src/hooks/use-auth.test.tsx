import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("@/lib/api", () => {
    return {
        api: {
            get: vi.fn(),
            post: vi.fn(),
        },
        getToken: vi.fn(),
        setToken: vi.fn(),
    };
});

import { api, getToken, setToken } from "@/lib/api";
import { AuthProvider } from "./use-auth";
import { useAuth } from "./use-auth-hook";

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AuthProvider>{children}</AuthProvider>
);

describe("AuthProvider", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.mocked(getToken).mockReturnValue(null);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("throws when useAuth is used outside the provider", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        expect(() => renderHook(() => useAuth())).toThrowError(/AuthProvider/);
        errorSpy.mockRestore();
    });

    it("exposes unauthenticated state after bootstrap", async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
    });

    it("logs in, persists token and logs out", async () => {
        const user = {
            id: 1,
            email: "admin@example.com",
            firstName: "Admin",
            lastName: "User",
            fullName: "Admin User",
            userType: "Admin",
        };

        vi.mocked(api.post).mockResolvedValue({
            data: {
                data: {
                    token: "jwt-token",
                    refreshToken: "refresh",
                    expiresAt: "",
                    user,
                },
            },
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        let success = false;
        await act(async () => {
            success = await result.current.login("admin@example.com", "secret");
        });

        expect(success).toBe(true);
        expect(setToken).toHaveBeenCalledWith("jwt-token");
        expect(result.current.user?.email).toBe("admin@example.com");
        expect(result.current.isAuthenticated).toBe(true);
        expect(JSON.parse(localStorage.getItem("auth_user") ?? "null")).toMatchObject({ email: "admin@example.com" });

        act(() => {
            result.current.logout();
        });

        expect(setToken).toHaveBeenCalledWith(null);
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
    });

    it("hydrates stored user when available", async () => {
        const hydrated = {
            id: 2,
            email: "stored@example.com",
            firstName: "Stored",
            lastName: "User",
            fullName: "Stored User",
            userType: "Agent",
            name: "Stored User",
        };
        localStorage.setItem("auth_user", JSON.stringify(hydrated));
        vi.mocked(getToken).mockReturnValue("token");
        vi.mocked(api.get).mockResolvedValue({ data: { data: hydrated } });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(api.get).toHaveBeenCalledWith("/auth/profile");
        expect(result.current.user?.email).toBe("stored@example.com");
    });
});
