"use client";

import type { RssSourceRecord } from "@readerx/persistence";
import { ArrowLeft, ChevronRight, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRssSourceMutations } from "../hooks/use-rss-sources";
import { useRssSourceStore } from "../store";

type RssSourceEditorPanelProps = {
	readonly source: RssSourceRecord;
};

const ARTICLE_STYLES = ["0", "1", "2"] as const;

function getRawField(source: RssSourceRecord, field: string): string {
	const value = source.raw[field];
	return typeof value === "string" ? value : "";
}

function RssSourceEditorPanel({ source }: RssSourceEditorPanelProps) {
	const t = useTranslations("rssSourceManager");
	const expandedSections = useRssSourceStore((s) => s.expandedSections);
	const toggleSection = useRssSourceStore((s) => s.toggleSection);
	const selectSource = useRssSourceStore((s) => s.selectSource);
	const goBack = useRssSourceStore((s) => s.goBack);
	const { save, remove } = useRssSourceMutations();

	// Local editing state
	const [sourceName, setSourceName] = useState(source.sourceName);
	const [sourceUrl, setSourceUrl] = useState(source.sourceUrl);
	const [sourceGroup, setSourceGroup] = useState(source.sourceGroup ?? "");
	const [articleStyle, setArticleStyle] = useState(
		String(source.raw.articleStyle ?? "0"),
	);
	const [ruleArticles, setRuleArticles] = useState(
		getRawField(source, "ruleArticles"),
	);
	const [ruleTitle, setRuleTitle] = useState(getRawField(source, "ruleTitle"));
	const [ruleContent, setRuleContent] = useState(
		getRawField(source, "ruleContent"),
	);
	const [ruleDescription, setRuleDescription] = useState(
		getRawField(source, "ruleDescription"),
	);

	// Reset local state when source identity changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally use sourceUrl as trigger
	useEffect(() => {
		setSourceName(source.sourceName);
		setSourceUrl(source.sourceUrl);
		setSourceGroup(source.sourceGroup ?? "");
		setArticleStyle(String(source.raw.articleStyle ?? "0"));
		setRuleArticles(getRawField(source, "ruleArticles"));
		setRuleTitle(getRawField(source, "ruleTitle"));
		setRuleContent(getRawField(source, "ruleContent"));
		setRuleDescription(getRawField(source, "ruleDescription"));
	}, [source.sourceUrl]);

	const handleSave = useCallback(() => {
		const { sourceGroup: _sg, ...rest } = source;
		const updated: RssSourceRecord = {
			...rest,
			sourceName,
			sourceUrl,
			...(sourceGroup ? { sourceGroup } : {}),
			updatedAt: Date.now(),
			raw: {
				...source.raw,
				articleStyle,
				ruleArticles,
				ruleTitle,
				ruleContent,
				ruleDescription,
			},
		};
		save.mutate(updated, {
			onSuccess: () => {
				toast.success(t("saved"));
			},
		});
	}, [
		source,
		sourceName,
		sourceUrl,
		sourceGroup,
		articleStyle,
		ruleArticles,
		ruleTitle,
		ruleContent,
		ruleDescription,
		save,
		t,
	]);

	const handleDelete = useCallback(() => {
		remove.mutate(source.sourceUrl, {
			onSuccess: () => {
				toast.success(t("deleted"));
				selectSource(null);
			},
		});
	}, [remove, source.sourceUrl, selectSource, t]);

	return (
		<div className="flex h-full flex-col overflow-y-auto">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-4 py-3">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						className="md:hidden size-7"
						onClick={goBack}
					>
						<ArrowLeft className="size-4" />
					</Button>
					<h3 className="max-w-[200px] truncate text-sm font-semibold">
						{source.sourceName}
					</h3>
				</div>
				<div className="flex items-center gap-1.5">
					<Button size="sm" onClick={handleSave} className="text-xs">
						<Save className="size-3.5" />
						{t("save")}
					</Button>
					<Button
						variant="destructive"
						size="icon"
						className="size-7"
						onClick={handleDelete}
					>
						<Trash2 className="size-3.5" />
					</Button>
				</div>
			</div>

			{/* Basic Info Section */}
			<CollapsibleSection
				title={t("sectionBasic")}
				sectionKey="basic"
				expanded={expandedSections.has("basic")}
				onToggle={toggleSection}
			>
				<FieldRow label={t("fieldName")}>
					<Input
						value={sourceName}
						onChange={(e) => setSourceName(e.target.value)}
						className="h-8 text-xs"
					/>
				</FieldRow>
				<FieldRow label={t("fieldUrl")}>
					<Input
						value={sourceUrl}
						onChange={(e) => setSourceUrl(e.target.value)}
						className="h-8 text-xs"
					/>
				</FieldRow>
				<FieldRow label={t("fieldGroup")}>
					<Input
						value={sourceGroup}
						onChange={(e) => setSourceGroup(e.target.value)}
						className="h-8 text-xs"
					/>
				</FieldRow>
				<FieldRow label={t("fieldArticleStyle")}>
					<Select value={articleStyle} onValueChange={setArticleStyle}>
						<SelectTrigger className="h-8 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ARTICLE_STYLES.map((style) => (
								<SelectItem key={style} value={style}>
									{t(`articleStyle${style}`)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FieldRow>
			</CollapsibleSection>

			{/* Rules Section */}
			<CollapsibleSection
				title={t("sectionRules")}
				sectionKey="rules"
				expanded={expandedSections.has("rules")}
				onToggle={toggleSection}
			>
				<FieldRow label={t("fieldRuleArticles")}>
					<Textarea
						value={ruleArticles}
						onChange={(e) => setRuleArticles(e.target.value)}
						className="min-h-[60px] text-xs"
						rows={2}
					/>
				</FieldRow>
				<FieldRow label={t("fieldRuleTitle")}>
					<Input
						value={ruleTitle}
						onChange={(e) => setRuleTitle(e.target.value)}
						className="h-8 text-xs"
					/>
				</FieldRow>
				<FieldRow label={t("fieldRuleContent")}>
					<Textarea
						value={ruleContent}
						onChange={(e) => setRuleContent(e.target.value)}
						className="min-h-[60px] text-xs"
						rows={2}
					/>
				</FieldRow>
				<FieldRow label={t("fieldRuleDescription")}>
					<Input
						value={ruleDescription}
						onChange={(e) => setRuleDescription(e.target.value)}
						className="h-8 text-xs"
					/>
				</FieldRow>
			</CollapsibleSection>
		</div>
	);
}

/* ─── Internal helpers ────────────────────────────────────── */

function CollapsibleSection({
	title,
	sectionKey,
	expanded,
	onToggle,
	children,
}: {
	readonly title: string;
	readonly sectionKey: string;
	readonly expanded: boolean;
	readonly onToggle: (key: string) => void;
	readonly children: React.ReactNode;
}) {
	return (
		<div className="border-b border-border">
			<button
				type="button"
				onClick={() => onToggle(sectionKey)}
				className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-1"
			>
				{title}
				<ChevronRight
					className={`size-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
				/>
			</button>
			{expanded && <div className="space-y-3 px-4 pb-4">{children}</div>}
		</div>
	);
}

function FieldRow({
	label,
	children,
}: {
	readonly label: string;
	readonly children: React.ReactNode;
}) {
	return (
		<div className="space-y-1">
			<Label className="text-xs text-muted-foreground">{label}</Label>
			{children}
		</div>
	);
}

export { RssSourceEditorPanel };
