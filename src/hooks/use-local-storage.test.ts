import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { useLocalStorage } from "./use-local-storage";

describe("useLocalStorage", () => {
    const KEY = "test-key";

    beforeEach(() => {
        localStorage.clear();
    });

    it("hydrates from existing localStorage value", () => {
        localStorage.setItem(KEY, JSON.stringify("from-storage"));
        const { result } = renderHook(() => useLocalStorage(KEY, "fallback"));
        expect(result.current[0]).toBe("from-storage");
    });

    it("returns initial value when storage is empty or invalid", () => {
        const { result: emptyResult } = renderHook(() => useLocalStorage(KEY, "initial"));
        expect(emptyResult.current[0]).toBe("initial");

        localStorage.setItem(KEY, "not-json");
        const { result: invalidResult } = renderHook(() => useLocalStorage(KEY, "initial"));
        expect(invalidResult.current[0]).toBe("initial");
    });

    it("updates state and persists to localStorage", () => {
        const { result } = renderHook(() => useLocalStorage(KEY, "start"));
        act(() => {
            result.current[1]("updated");
        });
        expect(result.current[0]).toBe("updated");
        expect(localStorage.getItem(KEY)).toBe(JSON.stringify("updated"));
    });

    it("reacts to storage events", () => {
        const { result } = renderHook(() => useLocalStorage(KEY, "start"));
        act(() => {
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: KEY,
                    newValue: JSON.stringify("broadcast"),
                    storageArea: window.localStorage,
                })
            );
        });
        expect(result.current[0]).toBe("broadcast");

        act(() => {
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: KEY,
                    newValue: null,
                    storageArea: window.localStorage,
                })
            );
        });
        expect(result.current[0]).toBe("start");
    });
});
