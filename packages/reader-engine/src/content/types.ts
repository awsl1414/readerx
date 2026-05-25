export interface ReplaceRule {
	id: number;
	name: string;
	group?: string;
	pattern: string;
	replacement: string;
	scope?: string;
	scopeTitle: boolean;
	scopeContent: boolean;
	isEnabled: boolean;
	isRegex: boolean;
	order: number;
}
