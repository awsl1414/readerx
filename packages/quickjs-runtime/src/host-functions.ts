import type { HostFunctions } from "./types";

export type HostFunctionOptions = {
	fetchFn: (url: string) => Promise<string>;
	onLog: (message: string) => void;
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
	};
}
