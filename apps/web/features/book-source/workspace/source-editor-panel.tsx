"use client";

import type {
	BookSourceData,
	RuleRecord,
	SourceModule,
	SourceModuleType,
} from "@readerx/schemas";
import { SaveIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TagInput } from "@/features/shared-rule-ui";
import { useSourceMutations } from "../hooks/use-source-mutations";
import { ModuleEditor } from "./module-editor";
import { ModuleNavigator } from "./module-navigator";

type SourceEditorPanelProps = {
	readonly source: RuleRecord<"book-source"> | undefined;
	readonly onDeselect: () => void;
};

/** Create an empty module of a given type. */
function createEmptyModule(type: SourceModuleType): SourceModule {
	return { type, rules: {} };
}

function SourceEditorPanel({ source, onDeselect }: SourceEditorPanelProps) {
	const t = useTranslations("sourceManager");
	const { save, remove } = useSourceMutations();

	// Local editing state
	const [localData, setLocalData] = useState<BookSourceData | null>(null);
	const [localName, setLocalName] = useState("");
	const [localTags, setLocalTags] = useState<readonly string[]>([]);
	const [localEnabled, setLocalEnabled] = useState(true);
	const [localOrder, setLocalOrder] = useState(0);
	const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(
		null,
	);

	// Reset when source changes
	useEffect(() => {
		if (source) {
			setLocalData({ ...source.data, modules: [...source.data.modules] });
			setLocalName(source.name);
			setLocalTags(source.tags);
			setLocalEnabled(source.enabled);
			setLocalOrder(source.order);
			setSelectedModuleIndex(source.data.modules.length > 0 ? 0 : null);
		} else {
			setLocalData(null);
			setLocalName("");
			setLocalTags([]);
			setLocalEnabled(true);
			setLocalOrder(0);
			setSelectedModuleIndex(null);
		}
	}, [
		source?.id,
		source?.enabled,
		source?.tags,
		source?.data,
		source?.name,
		source?.order,
		source,
	]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally use id as trigger

	const selectedModule = useMemo(() => {
		if (!localData || selectedModuleIndex === null) return null;
		return localData.modules[selectedModuleIndex] ?? null;
	}, [localData, selectedModuleIndex]);

	const handleModuleChange = useCallback(
		(updatedModule: SourceModule) => {
			if (!localData || selectedModuleIndex === null) return;
			const newModules = [...localData.modules];
			newModules[selectedModuleIndex] = updatedModule;
			setLocalData({ ...localData, modules: newModules });
		},
		[localData, selectedModuleIndex],
	);

	const handleAddModule = useCallback(
		(type: SourceModuleType) => {
			if (!localData) return;
			const newModule = createEmptyModule(type);
			const newModules = [...localData.modules, newModule];
			setLocalData({ ...localData, modules: newModules });
			setSelectedModuleIndex(newModules.length - 1);
		},
		[localData],
	);

	const handleRemoveModule = useCallback(
		(index: number) => {
			if (!localData) return;
			const newModules = localData.modules.filter((_, i) => i !== index);
			setLocalData({ ...localData, modules: newModules });
			if (selectedModuleIndex !== null) {
				if (selectedModuleIndex >= newModules.length) {
					setSelectedModuleIndex(
						newModules.length > 0 ? newModules.length - 1 : null,
					);
				} else if (selectedModuleIndex === index) {
					setSelectedModuleIndex(
						newModules.length > 0
							? Math.min(index, newModules.length - 1)
							: null,
					);
				}
			}
		},
		[localData, selectedModuleIndex],
	);

	const handleSave = useCallback(() => {
		if (!source || !localData) return;
		const updated: RuleRecord<"book-source"> = {
			id: source.id,
			type: "book-source",
			name: localName,
			enabled: localEnabled,
			tags: localTags,
			order: localOrder,
			createdAt: source.createdAt,
			updatedAt: new Date().toISOString(),
			data: localData,
		};
		save.mutate(updated, {
			onSuccess: () => {
				toast.success(t("saved"));
			},
		});
	}, [
		source,
		localData,
		localName,
		localEnabled,
		localTags,
		localOrder,
		save,
		t,
	]);

	const handleDelete = useCallback(() => {
		if (!source) return;
		remove.mutate(source.id, {
			onSuccess: () => {
				toast.success(t("deleted"));
				onDeselect();
			},
		});
	}, [source, remove, onDeselect, t]);

	if (!source || !localData) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				{t("noSourceSelected")}
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-4 py-3">
				<h3 className="max-w-[280px] truncate text-sm font-semibold">
					{source.name}
				</h3>
				<div className="flex items-center gap-1.5">
					<Button
						size="sm"
						onClick={handleSave}
						className="text-xs"
						disabled={save.isPending}
					>
						<SaveIcon className="size-3.5" />
						{t("save")}
					</Button>
					<Button
						variant="destructive"
						size="icon"
						className="size-7"
						onClick={handleDelete}
						disabled={remove.isPending}
					>
						<TrashIcon className="size-3.5" />
					</Button>
				</div>
			</div>

			{/* Scrollable content */}
			<div className="flex-1 overflow-y-auto">
				{/* Basic Info Section */}
				<div className="p-4">
					<h4 className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
						{t("basicInfo")}
					</h4>
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="bs-name">{t("fieldName")}</Label>
							<Input
								id="bs-name"
								value={localName}
								onChange={(e) => setLocalName(e.target.value)}
								placeholder={t("fieldName")}
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label>{t("fieldTags")}</Label>
							<TagInput
								tags={localTags}
								onChange={setLocalTags}
								placeholder={t("fieldTags")}
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label htmlFor="bs-baseurl">{t("fieldBaseUrl")}</Label>
							<Input
								id="bs-baseurl"
								value={localData.baseUrl}
								onChange={(e) =>
									setLocalData({ ...localData, baseUrl: e.target.value })
								}
								placeholder="https://example.com"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label htmlFor="bs-urlpattern">{t("fieldUrlPattern")}</Label>
							<Input
								id="bs-urlpattern"
								value={localData.urlPattern ?? ""}
								onChange={(e) => {
									const val = e.target.value;
									if (val) {
										setLocalData({ ...localData, urlPattern: val });
									} else {
										const { urlPattern: _, ...rest } = localData;
										setLocalData(rest as BookSourceData);
									}
								}}
								placeholder="URL pattern regex"
							/>
						</div>

						<div className="grid grid-cols-3 gap-2">
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="bs-weight">{t("fieldWeight")}</Label>
								<Input
									id="bs-weight"
									type="number"
									value={localData.weight ?? 0}
									onChange={(e) =>
										setLocalData({
											...localData,
											weight: Number(e.target.value),
										})
									}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="bs-ratelimit">{t("fieldRateLimit")}</Label>
								<Input
									id="bs-ratelimit"
									type="number"
									value={localData.rateLimit ?? ""}
									onChange={(e) => {
										const val = e.target.value;
										if (val) {
											setLocalData({ ...localData, rateLimit: Number(val) });
										} else {
											const { rateLimit: _, ...rest } = localData;
											setLocalData(rest as BookSourceData);
										}
									}}
									placeholder="ms"
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label>{t("fieldEnabled")}</Label>
								<div className="flex items-center h-9">
									<input
										type="checkbox"
										checked={localEnabled}
										onChange={(e) => setLocalEnabled(e.target.checked)}
										className="size-4"
									/>
								</div>
							</div>
						</div>

						{localData.headers && (
							<div className="flex flex-col gap-1.5">
								<Label>{t("fieldHeader")}</Label>
								<div className="rounded-lg border border-border p-3">
									<pre className="text-xs font-mono">
										{JSON.stringify(localData.headers, null, 2)}
									</pre>
								</div>
							</div>
						)}

						<div className="flex flex-col gap-1.5">
							<Label htmlFor="bs-loginurl">{t("fieldLoginUrl")}</Label>
							<Input
								id="bs-loginurl"
								value={localData.loginUrl ?? ""}
								onChange={(e) => {
									const val = e.target.value;
									if (val) {
										setLocalData({ ...localData, loginUrl: val });
									} else {
										const { loginUrl: _, ...rest } = localData;
										setLocalData(rest as BookSourceData);
									}
								}}
								placeholder="https://example.com/login"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label htmlFor="bs-description">{t("fieldDescription")}</Label>
							<Input
								id="bs-description"
								value={localData.description ?? ""}
								onChange={(e) => {
									const val = e.target.value;
									if (val) {
										setLocalData({ ...localData, description: val });
									} else {
										const { description: _, ...rest } = localData;
										setLocalData(rest as BookSourceData);
									}
								}}
								placeholder={t("fieldDescription")}
							/>
						</div>
					</div>
				</div>

				<Separator />

				{/* Modules Section */}
				<div>
					<div className="flex items-center justify-between px-4 pt-3 pb-1">
						<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							{t("modules")}
						</h4>
						<Badge variant="secondary" className="text-[10px]">
							{t("moduleCount", { count: localData.modules.length })}
						</Badge>
					</div>

					<ModuleNavigator
						modules={localData.modules}
						selectedIndex={selectedModuleIndex}
						onSelect={setSelectedModuleIndex}
						onAdd={handleAddModule}
						onRemove={handleRemoveModule}
					/>

					{selectedModule ? (
						<ModuleEditor
							module={selectedModule}
							onChange={handleModuleChange}
						/>
					) : (
						<div className="p-6 text-center text-sm text-muted-foreground">
							{t("selectOrAddModule")}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export { SourceEditorPanel };