import type { HostFunctions } from "./types";

export type HostFunctionOptions = {
	fetchFn: (url: string) => Promise<string>;
	fetchWithOptions: (
		url: string,
		options: Record<string, unknown>,
	) => Promise<string>;
	onLog: (message: string) => void;
	evalRule: (rule: string) => Promise<string>;
	evalRuleList: (rule: string) => Promise<string[]>;
};

export function createHostFunctions(
	options: HostFunctionOptions,
): HostFunctions {
	const variables = new Map<string, string>();

	return {
		async ajax(url: string): Promise<string> {
			return options.fetchFn(url);
		},

		log(message: string): void {
			options.onLog(message);
		},

		base64Encode(str: string): string {
			return btoa(str);
		},

		base64Decode(str: string): string {
			return atob(str);
		},

		put(key: string, value: string): void {
			variables.set(key, value);
		},

		get(key: string): string {
			return variables.get(key) ?? "";
		},

		async evalRule(rule: string): Promise<string> {
			return options.evalRule(rule);
		},

		async evalRuleList(rule: string): Promise<string[]> {
			return options.evalRuleList(rule);
		},

		async ajaxWithOption(
			url: string,
			optionJson: string,
		): Promise<string> {
			let parsed: Record<string, unknown> = {};
			try {
				const raw: unknown = JSON.parse(optionJson);
				if (typeof raw === "object" && raw !== null) {
					parsed = raw as Record<string, unknown>;
				}
			} catch {
				// 无效 JSON，使用空选项
			}
			return options.fetchWithOptions(url, parsed);
		},
	};
}
