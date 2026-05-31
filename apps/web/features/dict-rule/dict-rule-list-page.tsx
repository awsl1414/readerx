"use client";

import type { DictField, DictRuleData, RequestConfig, RuleRecord } from "@readerx/schemas";
import { validateDictRuleFile } from "@readerx/schemas";
import { BookOpenIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { RuleImportDialog } from "@/features/shared-rule-ui";
import { useDictRuleMutations, useDictRules } from "./hooks/use-dict-rules";
import { DictRuleEditor } from "./dict-rule-editor";

/** Strip undefined values from a parsed request to satisfy exactOptionalPropertyTypes. */
function cleanRequestConfig(raw: Record<string, unknown>): RequestConfig {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(raw)) {
		if (value !== undefined) {
			result[key] = value;
		}
	}
	return result as RequestConfig;
}

function DictRuleListPage() {
	const { data: rules = [], isLoading } = useDictRules();
	const { save, remove, toggleEnabled, importRules } = useDictRuleMutations();

	const [searchQuery, setSearchQuery] = useState("");
	const [editRuleId, setEditRuleId] = useState<string | null>(null);
	const [importOpen, setImportOpen] = useState(false);

	const filteredRules = useMemo(() => {
		if (!searchQuery.trim()) return rules;
		const query = searchQuery.toLowerCase();
		return rules.filter((rule) => {
			const nameMatch = rule.name.toLowerCase().includes(query);
			const data = rule.data as DictRuleData;
			const urlMatch = (data.request.url ?? "").toLowerCase().includes(query);
			const tagMatch = rule.tags.some((tag) =>
				tag.toLowerCase().includes(query),
			);
			return nameMatch || urlMatch || tagMatch;
		});
	}, [rules, searchQuery]);

	const editingRule = editRuleId
		? (rules.find((r) => r.id === editRuleId) ?? null)
		: null;
	const isNew = editRuleId !== null && !rules.some((r) => r.id === editRuleId);

	const handleAdd = () => {
		setEditRuleId(crypto.randomUUID());
	};

	const handleSave = (rule: RuleRecord<"dict">) => {
		save.mutate(rule, {
			onSuccess: () => {
				toast.success("已保存");
				setEditRuleId(null);
			},
			onError: (err) => toast.error(`保存失败: ${err.message}`),
		});
	};

	const handleDelete = (id: string) => {
		remove.mutate(id, {
			onSuccess: () => {
				toast.success("已删除");
				setEditRuleId(null);
			},
			onError: (err) => toast.error(`删除失败: ${err.message}`),
		});
	};

	const handleToggle = (id: string, enabled: boolean) => {
		toggleEnabled.mutate(
			{ id, enabled },
			{
				onError: (err) => toast.error(`切换失败: ${err.message}`),
			},
		);
	};

	const handleImport = (raw: string) => {
		try {
			const parsed: unknown = JSON.parse(raw);
			const validation = validateDictRuleFile(parsed);
			if (!validation.ok) {
				toast.error(`导入失败: ${validation.error.message}`);
				return;
			}
			// Build records from raw JSON to avoid exactOptionalPropertyTypes mismatch
			const fileObj = parsed as Record<string, unknown>;
			const rawRules = fileObj["rules"] as Record<string, unknown>[];
			const now = new Date().toISOString();
			const records: RuleRecord<"dict">[] = rawRules.map(
				(item, index): RuleRecord<"dict"> => {
					const requestRaw = item["request"] as Record<string, unknown>;
					const data: DictRuleData = {
						request: cleanRequestConfig(requestRaw),
						...(item["description"] ? { description: item["description"] as string } : {}),
						...(item["weight"] != null ? { weight: item["weight"] as number } : {}),
						...(item["variables"] ? { variables: item["variables"] as Record<string, string> } : {}),
						...(item["fields"] ? { fields: item["fields"] as Record<string, DictField> } : {}),
					};

					return {
						id: crypto.randomUUID(),
						type: "dict" as const,
						name: item["name"] as string,
						enabled: (item["enabled"] as boolean) ?? true,
						tags: [...((item["tags"] as string[]) ?? [])],
						order: index,
						createdAt: now,
						updatedAt: now,
						data,
					};
				},
			);
			importRules.mutate(records, {
				onSuccess: () => {
					toast.success(`已导入 ${records.length} 条规则`);
				},
				onError: (err) => toast.error(`导入失败: ${err.message}`),
			});
		} catch (e) {
			toast.error(
				`导入失败: ${e instanceof Error ? e.message : "未知错误"}`,
			);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-muted-foreground text-sm">加载中...</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3">
				<h1 className="text-foreground text-base font-medium">词典规则</h1>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
						导入
					</Button>
					<Button size="sm" onClick={handleAdd}>
						<PlusIcon />
						添加
					</Button>
				</div>
			</div>

			{/* Search */}
			{rules.length > 0 && (
				<div className="px-4 pb-3">
					<div className="relative">
						<SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
						<Input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="搜索规则..."
							className="pl-8"
						/>
					</div>
				</div>
			)}

			{/* List */}
			<ScrollArea className="flex-1">
				{rules.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-6 py-12 text-center">
						<div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
							<BookOpenIcon className="text-muted-foreground size-6" />
						</div>
						<p className="text-foreground mb-1 text-sm font-medium">
							暂无词典规则
						</p>
						<p className="text-muted-foreground mb-6 text-xs">
							添加词典规则以查询在线词典并提取释义内容
						</p>
						<Button size="sm" onClick={handleAdd}>
							<PlusIcon />
							添加规则
						</Button>
					</div>
				) : filteredRules.length === 0 ? (
					<div className="flex items-center justify-center py-12">
						<p className="text-muted-foreground text-sm">未找到匹配的规则</p>
					</div>
				) : (
					<div className="divide-y divide-border">
						{filteredRules.map((rule) => {
							const data = rule.data as DictRuleData;
							const url = data.request.url ?? "";
							const weight = data.weight ?? 50;
							return (
								<button
									key={rule.id}
									type="button"
									className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
									onClick={() => setEditRuleId(rule.id)}
								>
									<div className="min-w-0 flex-1">
										<p className="text-foreground truncate text-sm font-medium">
											{rule.name}
										</p>
										<p className="text-muted-foreground truncate font-mono text-xs">
											{url || "未配置 URL"}
										</p>
									</div>
									<span className="text-muted-foreground shrink-0 text-xs">
										W:{weight}
									</span>
									<Switch
										checked={rule.enabled}
										onCheckedChange={(checked: boolean) =>
											handleToggle(rule.id, checked)
										}
										onClick={(e: React.MouseEvent) => e.stopPropagation()}
										size="sm"
										aria-label="Toggle enabled"
										className="shrink-0"
									/>
								</button>
							);
						})}
					</div>
				)}
			</ScrollArea>

			{/* Editor Dialog */}
			<DictRuleEditor
				rule={isNew ? null : editingRule}
				open={editRuleId !== null}
				onOpenChange={(open) => {
					if (!open) setEditRuleId(null);
				}}
				onSave={handleSave}
				onDelete={handleDelete}
			/>

			{/* Import Dialog */}
			<RuleImportDialog
				open={importOpen}
				onOpenChange={setImportOpen}
				ruleType="Dict"
				onImport={handleImport}
			/>
		</div>
	);
}

export { DictRuleListPage };
