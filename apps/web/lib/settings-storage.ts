import type { z } from "zod";

type SettingsStorage = {
	get<T>(key: string, fallback: T, schema?: z.ZodType<T>): T;
	set<T>(key: string, value: T): void;
	subscribe(key: string, callback: (value: unknown) => void): () => void;
};

class LocalStorageSettingsStorage implements SettingsStorage {
	get<T>(key: string, fallback: T, schema?: z.ZodType<T>): T {
		if (typeof window === "undefined") return fallback;
		try {
			const raw = localStorage.getItem(key);
			if (raw === null) return fallback;
			const parsed: unknown = JSON.parse(raw);
			if (schema) {
				const result = schema.safeParse(parsed);
				return result.success ? result.data : fallback;
			}
			return parsed as T;
		} catch {
			return fallback;
		}
	}

	set<T>(key: string, value: T): void {
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// localStorage full or unavailable — fail silently
		}
	}

	subscribe(key: string, callback: (value: unknown) => void): () => void {
		if (typeof window === "undefined") return () => {};
		function handler(e: StorageEvent) {
			if (e.key === key) {
				try {
					const parsed =
						e.newValue !== null ? JSON.parse(e.newValue) : undefined;
					callback(parsed);
				} catch {
					callback(undefined);
				}
			}
		}
		window.addEventListener("storage", handler);
		return () => window.removeEventListener("storage", handler);
	}
}

const settingsStorage: SettingsStorage = new LocalStorageSettingsStorage();

export type { SettingsStorage };
export { LocalStorageSettingsStorage, settingsStorage };
