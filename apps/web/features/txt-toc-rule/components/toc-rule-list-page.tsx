"use client";

import type { RuleRecord } from "@readerx/schemas";
import { validateTxtTocRuleFile } from "@readerx/schemas";
import { FileTextIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
	RuleImportDialog,
} from "@/features/shared-rule-ui";
import {
	useTocRuleMutations,
	useTocRules,
} from "../hooks/use-toc-rules";
import { TocRuleEditor } from "./toc-rule-editor";

function TocRuleListPage() {
	const { data: rules = [], isLoading } = useTocRules();
	const { save, remove, toggleEnabled, importRules } = useTocRuleMutations();

	const [searchQuery, setSearchQuery] = useState("");
	const [editRuleId, setEditRuleId] = useState<string | null>(null);
	const [importOpen, setImportOpen] = useState(false);

	const filteredRules = useMemo(() => {
		if (!searchQuery.trim()) return rules;
		const query = searchQuery.toLowerCase();
		return rules.filter((rule) => {
			const nameMatch = rule.name.toLowerCase().includes(query);
			const patternMatch = rule.data.pattern.toLowerCase().includes(query);
			const tagMatch = rule.tags.some((tag) =>
				tag.toLowerCase().includes(query),
			);
			return nameMatch || patternMatch || tagMatch;
		});
	}, [rules, searchQuery]);

	const editingRule = editRuleId
		? (rules.find((r) => r.id === editRuleId) ?? null)
		: null;
	const isNew = editRuleId !== null && !rules.some((r) => r.id === editRuleId);

	const handleAdd = () => {
		setEditRuleId(crypto.randomUUID());
	};

	const handleSave = (rule: RuleRecord<"txt-toc">) => {
		save.mutate(rule, {
			onSuccess: () => {
				toast.success("已保存");
				setEditRuleId(null);
			},
		});
	};

	const handleDelete = (id: string) => {
		remove.mutate(id, {
			onSuccess: () => {
				toast.success("已删除");
				setEditRuleId(null);
			},
		});
	};

	const handleToggle = (id: string, enabled: boolean) => {
		toggleEnabled.mutate({ id, enabled });
	};

	const handleImport = (raw: string) => {
		try {
			const parsed: unknown = JSON.parse(raw);
			const validation = validateTxtTocRuleFile(parsed);
			if (!validation.ok) {
				toast.error(`导入失败: ${validation.error.message}`);
				return;
			}
			const now = new Date().toISOString();
			const records: RuleRecord<"txt-toc">[] = validation.value.rules.map(
				(item, index) => {
					const data: RuleRecord<"txt-toc">["data"] = {
					...(item.description ? { description: item.description } : {}),
						pattern: item.pattern,
						...(item.flags ? { flags: item.flags } : {}),
					};
					return {
						id: crypto.randomUUID(),
						type: "txt-toc" as const,
						name: item.name,
						enabled: item.enabled ?? true,
						tags: [...(item.tags ?? [])],
						order: item.order ?? index,
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
				<h1 className="text-foreground text-base font-medium">目录规则</h1>
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
							<FileTextIcon className="text-muted-foreground size-6" />
						</div>
						<p className="text-foreground mb-1 text-sm font-medium">
							暂无目录规则
						</p>
						<p className="text-muted-foreground mb-6 text-xs">
							添加目录规则以识别 TXT 文件中的章节结构
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
						{filteredRules.map((rule) => (
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
										{rule.data.pattern}
									</p>
								</div>
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
						))}
					</div>
				)}
			</ScrollArea>

			{/* Edit Dialog */}
			<TocRuleEditor
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
				ruleType="TXT TOC"
				onImport={handleImport}
			/>
		</div>
	);
}

export { TocRuleListPage };