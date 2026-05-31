"use client";

import { UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

type RuleImportDialogLabels = {
	readonly cancelLabel?: string;
	readonly importLabel?: string;
	readonly uploadFileLabel?: string;
	readonly detectedLabel?: string;
	readonly descriptionLabel?: string;
};

type RuleImportDialogProps = {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly ruleType: string;
	readonly onImport: (raw: string) => void;
	readonly className?: string;
	readonly labels?: RuleImportDialogLabels;
};

function RuleImportDialog({
	open,
	onOpenChange,
	ruleType,
	onImport,
	labels = {},
}: RuleImportDialogProps) {
	const [rawInput, setRawInput] = useState("");
	const [previewCount, setPreviewCount] = useState<number | null>(null);
	const [parseError, setParseError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleTextChange = (value: string) => {
		setRawInput(value);
		detectPreview(value);
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const text = event.target?.result;
			if (typeof text === "string") {
				setRawInput(text);
				detectPreview(text);
			}
		};
		reader.readAsText(file);
	};

	const detectPreview = (text: string) => {
		setParseError(null);
		if (!text.trim()) {
			setPreviewCount(null);
			return;
		}
		try {
			const parsed = JSON.parse(text);
			if (Array.isArray(parsed)) {
				setPreviewCount(parsed.length);
			} else {
				setPreviewCount(1);
			}
		} catch {
			// Might be Legado format or other — let consumer handle
			setPreviewCount(null);
			setParseError("Not valid JSON. Consumer will attempt format detection.");
		}
	};

	const handleImport = () => {
		if (!rawInput.trim()) return;
		onImport(rawInput.trim());
		handleClose();
	};

	const handleClose = () => {
		setRawInput("");
		setPreviewCount(null);
		setParseError(null);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{labels.importLabel ?? "Import"} {ruleType}{" "}
						{labels.importLabel ? "" : "Rules"}
					</DialogTitle>
					<DialogDescription>
						{labels.descriptionLabel ??
							"Paste JSON or upload a file. Format will be auto-detected."}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-3">
					<Textarea
						value={rawInput}
						onChange={(e) => handleTextChange(e.target.value)}
						placeholder="Paste JSON array or Legado format here..."
						className="min-h-[160px] font-mono text-xs"
					/>

					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => fileInputRef.current?.click()}
						>
							<UploadIcon className="size-3.5" />
							{labels.uploadFileLabel ?? "Upload File"}
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							accept=".json,.txt"
							onChange={handleFileUpload}
							className="hidden"
						/>

						{previewCount !== null && (
							<span className={cn("text-xs", "text-muted-foreground")}>
								{labels.detectedLabel ?? "Detected"} {previewCount} item
								{previewCount !== 1 ? "s" : ""}
							</span>
						)}
						{parseError && (
							<span className="text-xs text-yellow-600 dark:text-yellow-400">
								{parseError}
							</span>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" size="sm" onClick={handleClose}>
						{labels.cancelLabel ?? "Cancel"}
					</Button>
					<Button size="sm" onClick={handleImport} disabled={!rawInput.trim()}>
						{labels.importLabel ?? "Import"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export type { RuleImportDialogProps };
export { RuleImportDialog };
