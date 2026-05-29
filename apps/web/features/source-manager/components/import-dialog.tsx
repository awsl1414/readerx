"use client";

import { useCallback, useState } from "react";
import { useSourceMutations } from "../hooks/use-sources";
import { importSources } from "../hooks/use-source-import";
import type { ImportResult } from "../types";
import { ImportResultReport } from "./import-result-report";

type ImportDialogProps = {
	readonly open: boolean;
	readonly onClose: () => void;
};

type ImportTab = "url" | "file" | "paste";

function ImportDialog({ open, onClose }: ImportDialogProps) {
	const [tab, setTab] = useState<ImportTab>("url");
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
				setError(
					e instanceof Error ? e.message : "JSON 解析失败",
				);
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
			handleImport(text);
		} catch (e: unknown) {
			setLoading(false);
			setError(
				e instanceof Error ? e.message : "网络请求失败",
			);
		}
	}, [urlInput, handleImport]);

	const handleFileImport = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = () => {
				handleImport(reader.result as string);
			};
			reader.readAsText(file);
		},
		[handleImport],
	);

	if (!open) return null;

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 50,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "oklch(0 0 0 / 0.5)",
			}}
		>
			<div
				style={{
					background: "oklch(0.15 0 0)",
					borderRadius: 12,
					padding: 24,
					width: "min(90vw, 560px)",
					maxHeight: "80vh",
					overflow: "auto",
				}}
			>
				<h2 style={{ marginBottom: 16, fontSize: "1.125rem", fontWeight: 600 }}>
					导入书源
				</h2>

				<div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
					{(["url", "file", "paste"] as const).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => setTab(t)}
							style={{
								padding: "4px 12px",
								borderRadius: 6,
								border: "1px solid",
								borderColor:
									tab === t ? "oklch(0.6 0.2 250)" : "oklch(0.3 0 0)",
								background:
									tab === t ? "oklch(0.2 0.05 250)" : "transparent",
								color: "oklch(0.85 0 0)",
								cursor: "pointer",
								fontSize: "0.875rem",
							}}
						>
							{t === "url" ? "URL 导入" : t === "file" ? "文件导入" : "粘贴导入"}
						</button>
					))}
				</div>

				{tab === "url" && (
					<div style={{ display: "flex", gap: 8 }}>
						<input
							type="url"
							placeholder="https://example.com/sources.json"
							value={urlInput}
							onChange={(e) => setUrlInput(e.target.value)}
							style={{
								flex: 1,
								padding: "6px 10px",
								borderRadius: 6,
								border: "1px solid oklch(0.3 0 0)",
								background: "oklch(0.12 0 0)",
								color: "oklch(0.9 0 0)",
								fontSize: "0.875rem",
							}}
						/>
						<button
							type="button"
							onClick={handleUrlImport}
							disabled={loading}
							style={{
								padding: "6px 16px",
								borderRadius: 6,
								background: "oklch(0.5 0.2 250)",
								color: "white",
								cursor: loading ? "wait" : "pointer",
								fontSize: "0.875rem",
								border: "none",
							}}
						>
							{loading ? "获取中..." : "获取并导入"}
						</button>
					</div>
				)}

				{tab === "file" && (
					<input
						type="file"
						accept=".json"
						onChange={handleFileImport}
						disabled={loading}
						style={{ color: "oklch(0.85 0 0)" }}
					/>
				)}

				{tab === "paste" && (
					<div>
						<textarea
							placeholder="粘贴 JSON（数组或单对象）"
							value={pasteInput}
							onChange={(e) => setPasteInput(e.target.value)}
							rows={8}
							style={{
								width: "100%",
								padding: 8,
								borderRadius: 6,
								border: "1px solid oklch(0.3 0 0)",
								background: "oklch(0.12 0 0)",
								color: "oklch(0.9 0 0)",
								fontSize: "0.875rem",
								fontFamily: "monospace",
								resize: "vertical",
								boxSizing: "border-box",
							}}
						/>
						<button
							type="button"
							onClick={() => handleImport(pasteInput)}
							disabled={loading || !pasteInput.trim()}
							style={{
								marginTop: 8,
								padding: "6px 16px",
								borderRadius: 6,
								background: "oklch(0.5 0.2 250)",
								color: "white",
								cursor: loading ? "wait" : "pointer",
								fontSize: "0.875rem",
								border: "none",
							}}
						>
							{loading ? "解析中..." : "导入"}
						</button>
					</div>
				)}

				{error && (
					<p style={{ marginTop: 12, color: "oklch(0.7 0.2 25)" }}>{error}</p>
				)}

				{result && (
					<div style={{ marginTop: 16 }}>
						<ImportResultReport result={result} />
					</div>
				)}

				<div style={{ marginTop: 16, textAlign: "right" }}>
					<button
						type="button"
						onClick={handleClose}
						style={{
							padding: "6px 16px",
							borderRadius: 6,
							border: "1px solid oklch(0.3 0 0)",
							background: "transparent",
							color: "oklch(0.85 0 0)",
							cursor: "pointer",
							fontSize: "0.875rem",
						}}
					>
						关闭
					</button>
				</div>
			</div>
		</div>
	);
}

export { ImportDialog };
