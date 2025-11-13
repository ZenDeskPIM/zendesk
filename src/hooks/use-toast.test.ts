import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useToast", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("adds and dismisses toasts via the public API", async () => {
        const mod = await import("./use-toast");
        const { useToast, toast } = mod;

        const { result } = renderHook(() => useToast());

        act(() => {
            toast({ title: "Olá" });
        });

        expect(result.current.toasts).toHaveLength(1);
        const toastId = result.current.toasts[0].id;
        expect(result.current.toasts[0].title).toBe("Olá");

        act(() => {
            result.current.dismiss(toastId);
        });

        expect(result.current.toasts[0]?.open).toBe(false);

        await act(async () => {
            vi.runAllTimers();
        });

        expect(result.current.toasts).toHaveLength(0);
    });

    it("reducer updates and removes toasts", async () => {
        const mod = await import("./use-toast");
        const { reducer } = mod;

        const added = reducer({ toasts: [] }, {
            type: "ADD_TOAST",
            toast: { id: "1", title: "Primeiro", open: true },
        } as any);
        const updated = reducer(added, {
            type: "UPDATE_TOAST",
            toast: { id: "1", description: "Atualizado" },
        } as any);
        expect(updated.toasts[0].description).toBe("Atualizado");

        const removed = reducer(updated, {
            type: "REMOVE_TOAST",
            toastId: "1",
        } as any);
        expect(removed.toasts).toHaveLength(0);
    });
});
