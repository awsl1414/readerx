/**
 * 正则替换
 * 参考 docs/book-source-rule-engine.md 正则替换部分
 *
 * 处理规则中的 ## 正则替换链
 * 格式：规则##正则##替换文本##正则2##替换2
 */

/** 正则替换项 */
export interface RegexReplacement {
	pattern: string;
	replacement: string;
	/** 是否只替换第一个匹配（### 三井号分隔时为 true） */
	replaceFirst: boolean;
}

/**
 * 解析 ## 分隔的替换链
 *
 * @example
 * parseReplaceChain("class.title##^【(.+)】##$1")
 * // { rule: "class.title", replacements: [{ pattern: "^【(.+)】", replacement: "$1", replaceFirst: false }] }
 *
 * parseReplaceChain("class.title##regex###replace")
 * // replaceFirst: true（### 三井号表示只替换第一个匹配）
 */
export function parseReplaceChain(ruleStr: string): {
	rule: string;
	replacements: RegexReplacement[];
} {
	// 按 ## 分割，但需要区分 ### (replaceFirst)
	const parts = splitByDoubleHash(ruleStr);

	if (parts.length < 2) {
		return { rule: ruleStr, replacements: [] };
	}

	const baseRule = parts[0] ?? "";
	const replacements: RegexReplacement[] = [];

	// 交替 pattern / replacement
	let i = 1;
	while (i < parts.length) {
		const pattern = parts[i] ?? "";
		const replacement = parts[i + 1] ?? "";
		// ### 三井号分隔时 replacement 后面紧跟 ### 表示 replaceFirst
		const replaceFirst = parts[i + 2] === "";
		replacements.push({ pattern, replacement, replaceFirst });
		i += replaceFirst ? 3 : 2;
	}

	return { rule: baseRule, replacements };
}

/**
 * 对内容应用替换链
 */
export function applyReplacements(
	content: string,
	replacements: RegexReplacement[],
): string {
	let result = content;
	for (const { pattern, replacement, replaceFirst } of replacements) {
		if (pattern === "") continue;
		try {
			const regex = new RegExp(pattern, replaceFirst ? "" : "g");
			if (replaceFirst) {
				result = result.replace(regex, replacement);
			} else {
				result = result.replace(regex, replacement);
			}
		} catch {
			// 无效正则，跳过
		}
	}
	return result;
}

/**
 * 按 ## 分割字符串，处理 ### 三井号
 * ### 表示 replaceFirst，会产生一个空字符串元素
 */
function splitByDoubleHash(str: string): string[] {
	const result: string[] = [];
	let current = "";
	let i = 0;

	while (i < str.length) {
		// 检查 ### (三井号)
		if (
			str[i] === "#" &&
			i + 2 < str.length &&
			str[i + 1] === "#" &&
			str[i + 2] === "#"
		) {
			result.push(current);
			current = "";
			// ### 等同于 ## + ##，插入一个空段标记 replaceFirst
			result.push("");
			i += 3;
			continue;
		}
		// 检查 ## (双井号)
		if (str[i] === "#" && i + 1 < str.length && str[i + 1] === "#") {
			result.push(current);
			current = "";
			i += 2;
			continue;
		}
		current += str[i];
		i++;
	}

	result.push(current);
	return result;
}
