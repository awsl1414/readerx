/**
 * 正则替换
 * 参考 docs/book-source-rule-engine.md 正则替换部分
 */

export class AnalyzeByRegex {
	/**
	 * 执行正则替换
	 * 格式：规则##正则表达式##替换文本
	 * 支持 $1, $2... 引用捕获组
	 */
	replace(content: string, pattern: string, replacement: string): string {
		try {
			const regex = new RegExp(pattern, "g");
			return content.replace(regex, replacement);
		} catch {
			return content;
		}
	}

	/**
	 * 解析 ## 分隔的替换链
	 */
	parseReplaceChain(rule: string): {
		rule: string;
		replacements: Array<{ pattern: string; replacement: string }>;
	} {
		const parts = rule.split("##");
		if (parts.length < 3) {
			return { rule, replacements: [] };
		}

		const baseRule = parts[0] ?? "";
		const replacements: Array<{ pattern: string; replacement: string }> = [];

		for (let i = 1; i < parts.length - 1; i += 2) {
			replacements.push({
				pattern: parts[i] ?? "",
				replacement: parts[i + 1] ?? "",
			});
		}

		return { rule: baseRule, replacements };
	}
}
