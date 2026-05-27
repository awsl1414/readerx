export type ReplaceRule = {
	readonly id: number;
	readonly name: string;
	readonly group?: string;
	readonly pattern: string;
	readonly replacement: string;
	readonly scope?: string;
	readonly scopeTitle: boolean;
	readonly scopeContent: boolean;
	readonly isEnabled: boolean;
	readonly isRegex: boolean;
	readonly order: number;
};
