import type { ReplaceRule } from "./types";

/**
 * 内容处理器 — 净化规则执行
 * 参考 docs/replace-rules.md
 */
export class ContentProcessor {
	private rules: ReplaceRule[] = [];

	setRules(rules: ReplaceRule[]): void {
		this.rules = rules.sort((a, b) => a.order - b.order);
	}

	process(content: string, isTitle: boolean): string {
		let result = content;
		for (const rule of this.rules) {
			if (!rule.isEnabled) continue;
			if (isTitle && !rule.scopeTitle) continue;
			if (!isTitle && !rule.scopeContent) continue;

			if (rule.isRegex) {
				try {
					result = result.replace(
						new RegExp(rule.pattern, "g"),
						rule.replacement,
					);
				} catch {
					// 无效正则，跳过
				}
			} else {
				result = result.replaceAll(rule.pattern, rule.replacement);
			}
		}
		return result;
	}
}
