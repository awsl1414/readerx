// features/source-manager/components/source-editor.tsx

"use client";

import type { BookSourceRecord } from "@readerx/persistence";
import { useCallback, useEffect, useState } from "react";
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
	useEffect(() => setLocal(source), [source]);
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
	const expandedSections = useSourceManagerStore((s) => s.expandedSections);
	const toggleSection = useSourceManagerStore((s) => s.toggleSection);
	const selectSource = useSourceManagerStore((s) => s.selectSource);
	const setDebuggerOpen = useSourceManagerStore((s) => s.setDebuggerOpen);
	const { save, remove } = useSourceMutations();

	const [localSource, setLocalSource] = useSourceEditorState(source);

	const handleChange = useCallback(
		(field: string, value: string) => {
			setLocalSource((prev) => applyFieldChange(prev, field, value));
		},
		[setLocalSource],
	);

	const handleSave = useCallback(() => {
		save.mutate(localSource as BookSourceRecord);
	}, [save, localSource]);

	const handleDelete = useCallback(() => {
		remove.mutate(source.bookSourceUrl);
		selectSource(null);
	}, [remove, source.bookSourceUrl, selectSource]);

	return (
		<div style={{ height: "100%", overflow: "auto" }}>
			{/* Header */}
			<div
				style={{
					padding: "12px 16px",
					borderBottom: "1px solid oklch(0.2 0 0)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<h3
					style={{
						fontSize: "1rem",
						fontWeight: 600,
						color: "oklch(0.9 0 0)",
					}}
				>
					{source.bookSourceName}
				</h3>
				<div style={{ display: "flex", gap: 8 }}>
					<button
						type="button"
						onClick={() => setDebuggerOpen(true)}
						style={{
							padding: "4px 12px",
							borderRadius: 6,
							border: "1px solid oklch(0.3 0.05 250)",
							background: "transparent",
							color: "oklch(0.7 0.1 250)",
							cursor: "pointer",
							fontSize: "0.8rem",
						}}
					>
						▶ 调试器
					</button>
					<button
						type="button"
						onClick={handleSave}
						style={{
							padding: "4px 12px",
							borderRadius: 6,
							background: "oklch(0.5 0.2 150)",
							color: "white",
							border: "none",
							cursor: "pointer",
							fontSize: "0.8rem",
						}}
					>
						保存
					</button>
					<button
						type="button"
						onClick={handleDelete}
						style={{
							padding: "4px 12px",
							borderRadius: 6,
							background: "oklch(0.5 0.2 25)",
							color: "white",
							border: "none",
							cursor: "pointer",
							fontSize: "0.8rem",
						}}
					>
						🗑
					</button>
				</div>
			</div>

			{/* Sections */}
			<RuleSection
				title="基本信息"
				sectionKey="basic"
				expanded={expandedSections.has("basic")}
				onToggle={toggleSection}
			>
				<RuleFieldEditor
					label="名称"
					fieldName="bookSourceName"
					value={localSource.bookSourceName as string}
					onChange={handleChange}
				/>
				<RuleFieldEditor
					label="URL"
					fieldName="bookSourceUrl"
					value={localSource.bookSourceUrl as string}
					onChange={handleChange}
				/>
				<RuleFieldEditor
					label="分组"
					fieldName="bookSourceGroup"
					value={(localSource.bookSourceGroup as string) ?? ""}
					onChange={handleChange}
				/>
			</RuleSection>

			<RuleSection
				title="搜索规则"
				sectionKey="search"
				expanded={expandedSections.has("search")}
				onToggle={toggleSection}
			>
				<RuleFieldEditor
					label="搜索 URL"
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
				title="书籍信息规则"
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
				title="目录规则"
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
				title="正文规则"
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
				title="Headers / 高级"
				sectionKey="advanced"
				expanded={expandedSections.has("advanced")}
				onToggle={toggleSection}
			>
				<RuleFieldEditor
					label="Header"
					fieldName="header"
					value={(localSource.header as string) ?? ""}
					onChange={handleChange}
				/>
				<RuleFieldEditor
					label="Login URL"
					fieldName="loginUrl"
					value={(localSource.loginUrl as string) ?? ""}
					onChange={handleChange}
				/>
				<RuleFieldEditor
					label="并发限制"
					fieldName="concurrentRate"
					value={(localSource.concurrentRate as string) ?? ""}
					onChange={handleChange}
				/>
			</RuleSection>
		</div>
	);
}

export { SourceEditor };
