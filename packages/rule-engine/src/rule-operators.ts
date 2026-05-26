/**
 * 规则操作符拆分
 * 参考 Legado RuleAnalyzer.kt 的括号平衡算法，重写为纯函数
 *
 * 将规则字符串按 && (AND)、|| (OR)、%% (ZIP) 拆分
 * ## 不拆分 — 它是正则替换，保留在段内由 regex.ts 处理
 */

import type { CombineOperator, RuleSegment } from "./types";

/** 开括号集合 */
const OPEN_BRACKETS = new Set(["(", "[", "{"]);
/** 闭括号 → 开括号映射 */
const CLOSE_TO_OPEN: Record<string, string> = {
	")": "(",
	"]": "[",
	"}": "{",
};

/**
 * 将规则字符串按操作符拆分为 RuleSegment[]
 *
 * 算法：单趟扫描，维护括号深度和引号状态
 * - 括号 `()[]{}` 内的操作符不拆分
 * - 引号 `'"` 内的操作符不拆分
 * - `##` 不是拆分操作符，保留在段内
 *
 * @example
 * splitRuleByOperators("class.a&&class.b")
 * // [{rule:"class.a", op:undefined}, {rule:"class.b", op:"&&"}]
 *
 * splitRuleByOperators("div[href&&val]")
 * // [{rule:"div[href&&val]", op:undefined}]
 */
export function splitRuleByOperators(rule: string): RuleSegment[] {
	if (rule.length === 0) return [];

	// Pass 1: 找到所有拆分点
	const splitPoints: Array<{ pos: number; op: CombineOperator }> = [];

	let i = 0;
	let inSingleQuote = false;
	let inDoubleQuote = false;
	const depth: Record<string, number> = { "(": 0, "[": 0, "{": 0 };
	let totalDepth = 0;

	while (i < rule.length) {
		const ch = rule.charAt(i);

		// 引号状态跟踪
		if (ch === "'" && !inDoubleQuote) {
			inSingleQuote = !inSingleQuote;
			i++;
			continue;
		}
		if (ch === '"' && !inSingleQuote) {
			inDoubleQuote = !inDoubleQuote;
			i++;
			continue;
		}
		if (inSingleQuote || inDoubleQuote) {
			i++;
			continue;
		}

		// 转义字符跳过下一个字符
		if (ch === "\\") {
			i += 2;
			continue;
		}

		// 括号深度跟踪
		if (OPEN_BRACKETS.has(ch)) {
			depth[ch] = (depth[ch] ?? 0) + 1;
			totalDepth++;
			i++;
			continue;
		}
		const open = CLOSE_TO_OPEN[ch];
		if (open && (depth[open] ?? 0) > 0) {
			depth[open] = (depth[open] ?? 0) - 1;
			totalDepth--;
			i++;
			continue;
		}

		// 只在顶层检测操作符
		if (totalDepth === 0) {
			const two = rule.substring(i, i + 2);
			if (two === "&&" || two === "||" || two === "%%") {
				splitPoints.push({ pos: i, op: two as CombineOperator });
				i += 2;
				continue;
			}
		}

		i++;
	}

	// 无拆分点 → 整条规则是一段
	if (splitPoints.length === 0) {
		return [{ rule: rule.trim(), operator: undefined }];
	}

	// Pass 2: 按拆分点切片
	const segments: RuleSegment[] = [];
	let cursor = 0;

	for (let idx = 0; idx < splitPoints.length; idx++) {
		const sp = splitPoints[idx]!;
		segments.push({
			rule: rule.substring(cursor, sp.pos).trim(),
			operator: idx === 0 ? undefined : splitPoints[idx - 1]?.op,
		});
		cursor = sp.pos + 2;
	}

	// 最后一段
	segments.push({
		rule: rule.substring(cursor).trim(),
		operator: splitPoints[splitPoints.length - 1]?.op,
	});

	return segments;
}

/**
 * 合并多个解析结果，按操作符规则
 * - && : 拼接所有结果
 * - || : 取第一个非空结果
 * - %% : 交错合并（ZIP）
 */
export function combineResults(
	results: Array<{ values: string[]; operator: CombineOperator | undefined }>,
): string[] {
	if (results.length === 0) return [];
	const first = results[0];
	if (results.length === 1) return first?.values ?? [];

	let acc = first?.values ?? [];

	for (let i = 1; i < results.length; i++) {
		const item = results[i];
		if (!item) continue;
		const { values, operator } = item;
		switch (operator) {
			case "&&":
				acc = [...acc, ...values];
				break;
			case "||":
				if (acc.length === 0 || (acc.length === 1 && acc[0] === "")) {
					acc = values;
				}
				break;
			case "%%":
				acc = zipMerge(acc, values);
				break;
			default:
				acc = [...acc, ...values];
		}
	}

	return acc;
}

/** 交错合并两个数组 */
function zipMerge(a: string[], b: string[]): string[] {
	const result: string[] = [];
	const maxLen = Math.max(a.length, b.length);
	for (let i = 0; i < maxLen; i++) {
		if (i < a.length) result.push(a[i]!);
		if (i < b.length) result.push(b[i]!);
	}
	return result;
}
