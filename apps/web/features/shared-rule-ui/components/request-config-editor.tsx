"use client";

import { useState } from "react";
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
import { PlusIcon, TrashIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RequestConfig } from "@readerx/schemas";

type RequestConfigEditorProps = {
	readonly config: RequestConfig;
	readonly onChange: (config: RequestConfig) => void;
	readonly className?: string;
	readonly disabled?: boolean;
};

const METHOD_OPTIONS = [
	{ label: "GET", value: "GET" },
	{ label: "POST", value: "POST" },
] as const;

/** Build a new RequestConfig by omitting a key if value is empty, otherwise setting it. */
function setOrOmit<K extends keyof RequestConfig>(
	config: RequestConfig,
	key: K,
	value: RequestConfig[K] | undefined,
): RequestConfig {
	if (value === undefined || value === "") {
		const { [key]: _, ...rest } = config;
		return rest as RequestConfig;
	}
	return { ...config, [key]: value };
}

function RequestConfigEditor({
	config,
	onChange,
	className,
	disabled,
}: RequestConfigEditorProps) {
	const updateUrl = (value: string) => {
		onChange(setOrOmit(config, "url", value || undefined));
	};

	const updateMethod = (value: string) => {
		onChange({ ...config, method: value as "GET" | "POST" });
	};

	const updateBody = (value: string) => {
		onChange(setOrOmit(config, "body", value || undefined));
	};

	const updateCharset = (value: string) => {
		onChange(setOrOmit(config, "charset", value || undefined));
	};

	const updateTimeout = (value: string) => {
		onChange(setOrOmit(config, "timeout", value ? Number(value) : undefined));
	};

	const updateRetry = (value: string) => {
		onChange(setOrOmit(config, "retry", value ? Number(value) : undefined));
	};

	const updateHeaders = (headers: Record<string, string> | undefined) => {
		if (headers === undefined) {
			const { headers: _, ...rest } = config;
			onChange(rest as RequestConfig);
		} else {
			onChange({ ...config, headers });
		}
	};

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			{/* URL + Method row */}
			<div className="flex items-end gap-2">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="req-method">Method</Label>
					<Select
						value={config.method ?? "GET"}
						onValueChange={updateMethod}
						disabled={disabled ?? false}
					>
						<SelectTrigger id="req-method" className="w-24">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{METHOD_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-1 flex-col gap-1.5">
					<Label htmlFor="req-url">URL</Label>
					<Input
						id="req-url"
						value={config.url ?? ""}
						onChange={(e) => updateUrl(e.target.value)}
						placeholder="https://example.com/api/search"
						disabled={disabled}
					/>
				</div>
			</div>

			{/* Headers key-value editor */}
			<HeadersEditor
			{...(config.headers ? { headers: config.headers } : {})}
			onChange={updateHeaders}
			disabled={disabled ?? false}
			/>

			{/* Body */}
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="req-body">Body</Label>
				<Textarea
					id="req-body"
					value={typeof config.body === "string" ? config.body : ""}
					onChange={(e) => updateBody(e.target.value)}
					placeholder='{"key": "value"} or form data'
					className="font-mono text-xs"
					disabled={disabled}
				/>
			</div>

			{/* Charset + Timeout + Retry row */}
			<div className="grid grid-cols-3 gap-2">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="req-charset">Charset</Label>
					<Input
						id="req-charset"
						value={config.charset ?? ""}
						onChange={(e) => updateCharset(e.target.value)}
						placeholder="UTF-8"
						disabled={disabled}
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="req-timeout">Timeout (ms)</Label>
					<Input
						id="req-timeout"
						type="number"
						value={config.timeout ?? ""}
						onChange={(e) => updateTimeout(e.target.value)}
						placeholder="10000"
						disabled={disabled}
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="req-retry">Retry</Label>
					<Input
						id="req-retry"
						type="number"
						value={config.retry ?? ""}
						onChange={(e) => updateRetry(e.target.value)}
						placeholder="0"
						disabled={disabled}
					/>
				</div>
			</div>
		</div>
	);
}

// ---- Headers Key-Value Editor (internal) ----

type HeadersEditorProps = {
	readonly headers?: Readonly<Record<string, string>>;
	readonly onChange: (headers: Record<string, string> | undefined) => void;
	readonly disabled: boolean;
};

function HeadersEditor({ headers, onChange, disabled }: HeadersEditorProps) {
	const [newKey, setNewKey] = useState("");
	const entries = Object.entries(headers ?? {});

	const handleAdd = () => {
		const key = newKey.trim();
		if (!key) return;
		const next: Record<string, string> = { ...(headers ?? {}), [key]: "" };
		onChange(next);
		setNewKey("");
	};

	const handleRemove = (key: string) => {
		const next: Record<string, string> = { ...(headers ?? {}) };
		delete next[key];
		onChange(Object.keys(next).length > 0 ? next : undefined);
	};

	const handleValueChange = (key: string, value: string) => {
		const next: Record<string, string> = { ...(headers ?? {}), [key]: value };
		onChange(next);
	};

	return (
		<div className="flex flex-col gap-1.5">
			<Label>Headers</Label>

			{entries.map(([key, value]) => (
				<div key={key} className="flex items-center gap-1.5">
					<Input
						value={key}
						readOnly
						className="w-32 font-mono text-xs"
						disabled={disabled}
					/>
					<Input
						value={value}
						onChange={(e) => handleValueChange(key, e.target.value)}
						className="flex-1 font-mono text-xs"
						disabled={disabled}
					/>
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-destructive shrink-0"
						onClick={() => handleRemove(key)}
						disabled={disabled}
						aria-label={`Remove header ${key}`}
					>
						<TrashIcon className="size-3.5" />
					</Button>
				</div>
			))}

			<div className="flex items-center gap-1.5">
				<Input
					value={newKey}
					onChange={(e) => setNewKey(e.target.value)}
					placeholder="Header name"
					className="w-32 font-mono text-xs"
					disabled={disabled}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							handleAdd();
						}
					}}
				/>
				<Button
					variant="outline"
					size="sm"
					onClick={handleAdd}
					disabled={disabled || !newKey.trim()}
					className="shrink-0"
				>
					<PlusIcon className="size-3.5" />
				</Button>
			</div>
		</div>
	);
}

export { RequestConfigEditor };
export type { RequestConfigEditorProps };