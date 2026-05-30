import { BaseDexieRepository } from "./base-repository";
import type { ReplaceRule } from "./types";

class ReplaceRuleRepository extends BaseDexieRepository<ReplaceRule> {
	async getEnabled(): Promise<ReplaceRule[]> {
		const all = await this.getAll();
		return all
			.filter((rule) => rule.enabled)
			.sort((a, b) => a.order - b.order);
	}

	async getByScope(
		name: string,
		origin: string,
		scope: "title" | "content",
	): Promise<ReplaceRule[]> {
		const all = await this.getEnabled();
		return all.filter((rule) => {
			if (scope === "title" && !rule.scopeTitle) return false;
			if (scope === "content" && !rule.scopeContent) return false;
			if (rule.excludeScope) {
				const excludeList = rule.excludeScope.split(",");
				if (excludeList.some((s) => s.trim() === name || s.trim() === origin)) {
					return false;
				}
			}
			if (rule.scope) {
				const scopeList = rule.scope.split(",");
				return scopeList.some((s) => s.trim() === name || s.trim() === origin);
			}
			return true;
		});
	}
}

export { ReplaceRuleRepository };
