import type { AnalyzeRuleMode } from "./types";

/**
 * AnalyzeRule — 规则解析主入口
 * 参考 docs/book-source-rule-engine.md
 */

export class AnalyzeRule {
	private content = "";
	private mode: AnalyzeRuleMode = "default";

	setContent(content: string): void {
		this.content = content;
		this.mode = this.detectMode(content);
	}

	/** 自动检测内容类型 */
	private detectMode(content: string): AnalyzeRuleMode {
		const trimmed = content.trim();
		if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
		return "default";
	}

	/** 检测规则模式 */
	detectRuleMode(rule: string): AnalyzeRuleMode {
		if (
			rule.startsWith("//") ||
			rule.startsWith("/html") ||
			rule.startsWith("/")
		)
			return "xpath";
		if (rule.startsWith("$.") || rule.startsWith("$[")) return "json";
		if (rule.startsWith("@js:") || rule.startsWith("<js>")) return "js";
		if (rule.startsWith("@CSS:")) return "default";
		return "default";
	}

	getContent(): string {
		return this.content;
	}

	getMode(): AnalyzeRuleMode {
		return this.mode;
	}
}
