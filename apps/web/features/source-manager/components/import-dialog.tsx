"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { importSources } from "../hooks/use-source-import";
import { useSourceMutations } from "../hooks/use-sources";
import type { ImportResult } from "../types";
import { ImportResultReport } from "./import-result-report";

type ImportDialogProps = {
	readonly open: boolean;
	readonly onClose: () => void;
};

function ImportDialog({ open, onClose }: ImportDialogProps) {
	const t = useTranslations("sourceManager");
	const [tab, setTab] = useState("url");
	const [urlInput, setUrlInput] = useState("");
	const [pasteInput, setPasteInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [result, setResult] = useState<ImportResult | null>(null);
	const { saveBatch } = useSourceMutations();

	const handleClose = useCallback(() => {
		setResult(null);
		setError("");
		setUrlInput("");
		setPasteInput("");
		setLoading(false);
		onClose();
	}, [onClose]);

	const handleImport = useCallback(
		async (json: string) => {
			setLoading(true);
			setError("");
			setResult(null);
			try {
				const parsed: unknown = JSON.parse(json);
				const sources = Array.isArray(parsed) ? parsed : [parsed];
				const importResult = importSources(
					sources as Record<string, unknown>[],
				);
				setResult(importResult);
				if (importResult.success.length > 0) {
					saveBatch.mutate(importResult.success);
				}
			} catch (e: unknown) {
				setError(e instanceof Error ? e.message : "JSON parse failed");
			} finally {
				setLoading(false);
			}
		},
		[saveBatch],
	);

	const handleUrlImport = useCallback(async () => {
		if (!urlInput.trim()) return;
		setLoading(true);
		try {
			const resp = await fetch(urlInput.trim());
			const text = await resp.text();
			void handleImport(text);
		} catch (e: unknown) {
			setLoading(false);
			setError(e instanceof Error ? e.message : "Network request failed");
		}
	}, [urlInput, handleImport]);

	const handleFileImport = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = () => {
				void handleImport(reader.result as string);
			};
			reader.readAsText(file);
		},
		[handleImport],
	);

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) handleClose();
			}}
		>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("importTitle")}</DialogTitle>
					<DialogDescription className="sr-only">
						{t("importTitle")}
					</DialogDescription>
				</DialogHeader>

				<Tabs value={tab} onValueChange={setTab}>
					<TabsList className="w-full">
						<TabsTrigger value="url" className="flex-1 text-xs">
							{t("importUrl")}
						</TabsTrigger>
						<TabsTrigger value="file" className="flex-1 text-xs">
							{t("importFile")}
						</TabsTrigger>
						<TabsTrigger value="paste" className="flex-1 text-xs">
							{t("importPaste")}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="url" className="mt-3">
						<div className="flex gap-2">
							<Input
								type="url"
								placeholder={t("importUrlPlaceholder")}
								value={urlInput}
								onChange={(e) => setUrlInput(e.target.value)}
								className="flex-1 text-sm"
							/>
							<Button size="sm" onClick={handleUrlImport} disabled={loading}>
								{loading ? t("importFetching") : t("importFetch")}
							</Button>
						</div>
					</TabsContent>

					<TabsContent value="file" className="mt-3">
						<Input
							type="file"
							accept=".json"
							onChange={handleFileImport}
							disabled={loading}
							className="text-sm"
						/>
					</TabsContent>

					<TabsContent value="paste" className="mt-3">
						<div className="flex flex-col gap-2">
							<Textarea
								placeholder={t("importPastePlaceholder")}
								value={pasteInput}
								onChange={(e) => setPasteInput(e.target.value)}
								rows={8}
								className="font-mono text-xs"
							/>
							<Button
								size="sm"
								onClick={() => void handleImport(pasteInput)}
								disabled={loading || !pasteInput.trim()}
								className="self-end"
							>
								{loading ? t("importParsing") : t("importImport")}
							</Button>
						</div>
					</TabsContent>
				</Tabs>

				{error && <p className="text-sm text-destructive">{error}</p>}

				{result && (
					<div className="mt-2">
						<ImportResultReport result={result} />
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

export { ImportDialog };
