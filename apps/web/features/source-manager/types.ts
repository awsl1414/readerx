// features/source-manager/types.ts

import type { BookSourceRecord } from "@readerx/persistence";

type FilterMode = "all" | "enabled" | "disabled" | "error";

type SourceCapabilities = {
	readonly usesJs: boolean;
	readonly usesCookieJar: boolean;
	readonly usesWebView: boolean;
	readonly usesJavaApi: boolean;
	readonly usesCrypto: boolean;
	readonly usesMultiPage: boolean;
	readonly webCompatibility: "full" | "partial" | "unsupported";
};

type ImportResult = {
	readonly success: BookSourceRecord[];
	readonly warnings: Array<{ source: BookSourceRecord; reasons: string[] }>;
	readonly failures: Array<{ raw: Record<string, unknown>; reasons: string[] }>;
};

type DebugStage = "search" | "bookInfo" | "toc" | "content";

type DebugStageResult = {
	readonly stage: DebugStage;
	readonly status: "pending" | "running" | "success" | "error";
	readonly timing: number;
	readonly requestUrl: string;
	readonly responseStatus: number;
	readonly result: string;
	readonly error: string;
	readonly logs: readonly DebugLog[];
};

type DebugLog = {
	readonly level: "info" | "warn" | "error";
	readonly message: string;
	readonly timestamp: number;
};

type NetworkRequest = {
	readonly method: string;
	readonly url: string;
	readonly status: number;
	readonly timing: number;
	readonly requestHeaders: Record<string, string>;
	readonly responseHeaders: Record<string, string>;
	readonly body: string;
};

export type {
	DebugLog,
	DebugStage,
	DebugStageResult,
	FilterMode,
	ImportResult,
	NetworkRequest,
	SourceCapabilities,
};
