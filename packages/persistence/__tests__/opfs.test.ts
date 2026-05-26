import { afterEach, describe, expect, it, vi } from "vitest";
import { OPFSStorage } from "../src/opfs";

function mockFileSystemFileHandle(content: ArrayBuffer): FileSystemFileHandle {
	return {
		kind: "file",
		name: "test",
		isSameEntry: vi.fn(),
		getFile: vi.fn().mockResolvedValue({
			arrayBuffer: vi.fn().mockResolvedValue(content),
		}),
		createWritable: vi.fn().mockResolvedValue({
			write: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		}),
	} as unknown as FileSystemFileHandle;
}

function mockStorage(rootDir: Record<string, unknown>) {
	Object.defineProperty(globalThis.navigator, "storage", {
		value: {
			getDirectory: vi.fn().mockResolvedValue(rootDir),
		},
		configurable: true,
		writable: true,
	});
}

describe("OPFSStorage", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("writeFile calls storage API", async () => {
		const rootDir = {
			getDirectoryHandle: vi.fn().mockResolvedValue({
				getFileHandle: vi
					.fn()
					.mockResolvedValue(mockFileSystemFileHandle(new ArrayBuffer(0))),
			}),
		};
		mockStorage(rootDir);

		const storage = new OPFSStorage();
		const data = new TextEncoder().encode("hello").buffer;
		await storage.writeFile("book/1.txt", data);

		expect(globalThis.navigator.storage.getDirectory).toHaveBeenCalled();
	});

	it("readFile returns null for missing file", async () => {
		const rootDir = {
			getDirectoryHandle: vi.fn().mockRejectedValue(new Error("not found")),
		};
		mockStorage(rootDir);

		const storage = new OPFSStorage();
		const result = await storage.readFile("missing.txt");
		expect(result).toBeNull();
	});

	it("exists returns false for missing file", async () => {
		const rootDir = {
			getDirectoryHandle: vi.fn().mockRejectedValue(new Error("not found")),
		};
		mockStorage(rootDir);

		const storage = new OPFSStorage();
		expect(await storage.exists("missing.txt")).toBe(false);
	});
});
