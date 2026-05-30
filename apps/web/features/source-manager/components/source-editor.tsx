"use client";

import type { BookSourceRecord } from "@readerx/persistence";
import { ArrowLeft, Bug, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSourceMutations } from "../hooks/use-sources";
import { useSourceManagerStore } from "../store";
import { RuleFieldEditor } from "./rule-field-editor";
import { RuleSection } from "./rule-section";

type SourceEditorProps = {
	readonly source: BookSourceRecord;
};

/** Simple local state management for editing a source. */
function useSourceEditorState(source: BookSourceRecord) {
	const [local, setLocal] = useState(source);
	// Only reset when the source identity changes (URL), not on every revalidation.
	// This prevents TanStack Query cache revalidation from wiping unsaved edits.
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally use bookSourceUrl as trigger to avoid wiping unsaved edits
	useEffect(() => setLocal(source), [source.bookSourceUrl]);
	return [local, setLocal] as const;
}

type RuleFields = {
	readonly [key: string]: string | undefined;
};

/** Extract string-valued fields from a nested rule object on the BookSourceRecord. */
function getRuleFields(source: BookSourceRecord, prefix: string): RuleFields {
	const rule = source[prefix as keyof BookSourceRecord];
	if (!rule || typeof rule !== "object") return {};
	return Object.fromEntries(
		Object.entries(rule as Record<string, unknown>)
			.filter(([, v]) => typeof v === "string")
			.map(([k, v]) => [`${prefix}.${k}`, v as string]),
	);
}

/** Update a field on the local source copy, supporting dot-notation for nested rules. */
function applyFieldChange(
	prev: BookSourceRecord,
	field: string,
	value: string,
): BookSourceRecord {
	if (field.includes(".")) {
		const dotIndex = field.indexOf(".");
		const prefix = field.slice(0, dotIndex);
		const nestedKey = field.slice(dotIndex + 1);
		const prevObj = prev[prefix as keyof BookSourceRecord];
		const prevRecord =
			prevObj && typeof prevObj === "object"
				? (prevObj as Record<string, unknown>)
				: {};
		return {
			...prev,
			[prefix]: { ...prevRecord, [nestedKey]: value },
		};
	}
	return { ...prev, [field]: value };
}

function SourceEditor({ source }: SourceEditorProps) {
	const t = useTranslations("sourceManager");
	const expandedSections = useSourceManagerStore((s) => s.expandedSections);
	const toggleSection = useSourceManagerStore((s) => s.toggleSection);
	const selectSource = useSourceManagerStore((s) => s.selectSource);
	const setDebuggerOpen = useSourceManagerStore((s) => s.setDebuggerOpen);
	const setDirty = useSourceManagerStore((s) => s.setDirty);
	const { save, remove } = useSourceMutations();

	const [localSource, setLocalSource] = useSourceEditorState(source);

	const handleChange = useCallback(
		(field: string, value: string) => {
			setLocalSource((prev) => applyFieldChange(prev, field, value));
			setDirty(true);
		},
		[setLocalSource, setDirty],
	);

	const handleSave = useCallback(() => {
		save.mutate(localSource as BookSourceRecord, {
			onSuccess: () => {
				toast.success(t("saved"));
				setDirty(false);
			},
		});
	}, [save, localSource, t, setDirty]);

	const handleDelete = useCallback(() => {
		remove.mutate(source.bookSourceUrl, {
			onSuccess: () => {
				toast.success(t("deleted"));
				selectSource(null);
			},
		});
	}, [remove, source.bookSourceUrl, selectSource, t]);

	return (
		<div className="flex h-full flex-col overflow-y-auto">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-4 py-3">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						className="md:hidden size-7"
						onClick={() => selectSource(null)}
					>
						<ArrowLeft className="size-4" />
					</Button>
					<h3 className="text-sm font-semibold truncate max-w-[200px]">
						{source.bookSourceName}
					</h3>
				</div>
				<div className="flex items-center gap-1.5">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setDebuggerOpen(true)}
						className="text-xs"
					>
						<Bug className="size-3.5" />
						{t("debug")}
					</Button>
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

			<Separator />

			{/* Sections */}
			<RuleSection
				title={t("sectionBasic")}
				sectionKey="basic"
				expanded={expandedSections.has("basic")}
				onToggle={toggleSection}
			>
				<RuleFieldEditor
					label={t("fieldName")}
					fieldName="bookSourceName"
					value={localSource.bookSourceName as string}
					onChange={handleChange}
				/>
				<RuleFieldEditor
					label={t("fieldUrl")}
					fieldName="bookSourceUrl"
					value={localSource.bookSourceUrl as string}
					onChange={handleChange}
				/>
				<RuleFieldEditor
					label={t("fieldGroup")}
					fieldName="bookSourceGroup"
					value={(localSource.bookSourceGroup as string) ?? ""}
					onChange={handleChange}
				/>
			</RuleSection>

			<RuleSection
				title={t("sectionSearch")}
				sectionKey="search"
				expanded={expandedSections.has("search")}
				onToggle={toggleSection}
			>
				<RuleFieldEditor
					label={t("fieldSearchUrl")}
					fieldName="searchUrl"
					value={(localSource.searchUrl as string) ?? ""}
					onChange={handleChange}
				/>
				{Object.entries(
					getRuleFields(localSource as BookSourceRecord, "ruleSearch"),
				).map(([key, val]) => (
					<RuleFieldEditor
						key={key}
						label={key.split(".")[1] ?? key}
						fieldName={key}
						value={val ?? ""}
						onChange={handleChange}
					/>
				))}
			</RuleSection>

			<RuleSection
				title={t("sectionBookInfo")}
				sectionKey="bookInfo"
				expanded={expandedSections.has("bookInfo")}
				onToggle={toggleSection}
			>
				{Object.entries(
					getRuleFields(localSource as BookSourceRecord, "ruleBookInfo"),
				).map(([key, val]) => (
					<RuleFieldEditor
						key={key}
						label={key.split(".")[1] ?? key}
						fieldName={key}
						value={val ?? ""}
						onChange={handleChange}
					/>
				))}
			</RuleSection>

			<RuleSection
				title={t("sectionToc")}
				sectionKey="toc"
				expanded={expandedSections.has("toc")}
				onToggle={toggleSection}
			>
				{Object.entries(
					getRuleFields(localSource as BookSourceRecord, "ruleToc"),
				).map(([key, val]) => (
					<RuleFieldEditor
						key={key}
						label={key.split(".")[1] ?? key}
						fieldName={key}
						value={val ?? ""}
						onChange={handleChange}
					/>
				))}
			</RuleSection>

			<RuleSection
				title={t("sectionContent")}
				sectionKey="content"
				expanded={expandedSections.has("content")}
				onToggle={toggleSection}
			>
				{Object.entries(
					getRuleFields(localSource as BookSourceRecord, "ruleContent"),
				).map(([key, val]) => (
					<RuleFieldEditor
						key={key}
						label={key.split(".")[1] ?? key}
						fieldName={key}
						value={val ?? ""}
						onChange={handleChange}
					/>
				))}
			</RuleSection>

			<RuleSection
				title={t("sectionAdvanced")}
				sectionKey="advanced"
				expanded={expandedSections.has("advanced")}
				onToggle={toggleSection}
			>
				<RuleFieldEditor
					label={t("fieldHeader")}
					fieldName="header"
					value={(localSource.header as string) ?? ""}
					onChange={handleChange}
				/>
				<RuleFieldEditor
					label={t("fieldLoginUrl")}
					fieldName="loginUrl"
					value={(localSource.loginUrl as string) ?? ""}
					onChange={handleChange}
				/>
				<RuleFieldEditor
					label={t("fieldConcurrentRate")}
					fieldName="concurrentRate"
					value={(localSource.concurrentRate as string) ?? ""}
					onChange={handleChange}
				/>
			</RuleSection>
		</div>
	);
}

export { SourceEditor };
