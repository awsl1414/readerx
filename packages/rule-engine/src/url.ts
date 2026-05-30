import { expandTemplate } from "./template";
import type { EvalContext } from "./types";

/**
 * Resolve a URL template with variables and optional base URL.
 *
 * 1. Replace {{key}} placeholders from ctx.variables, key, page
 * 2. Resolve relative URLs against ctx.baseUrl
 */
export function resolveUrl(template: string, ctx: EvalContext): string {
	const vars: Record<string, string | undefined> = { ...ctx.variables };
	if (ctx.key !== undefined) vars.key = ctx.key;
	if (ctx.page !== undefined) vars.page = String(ctx.page);
	let url = expandTemplate(template, vars);

	if (ctx.baseUrl && !url.startsWith("http")) {
		try {
			url = new URL(url, ctx.baseUrl).href;
		} catch {
			// Invalid URL — return as-is
		}
	}

	return url;
}
