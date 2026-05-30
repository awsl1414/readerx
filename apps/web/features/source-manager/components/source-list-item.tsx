"use client";

import type { BookSourceRecord } from "@readerx/persistence";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import type { SourceCapabilities } from "../types";

type SourceListItemProps = {
	readonly source: BookSourceRecord;
	readonly capabilities: SourceCapabilities;
	readonly selected: boolean;
	readonly onSelect: (url: string) => void;
	readonly onToggleEnabled: (url: string, enabled: boolean) => void;
};

function getCapabilityTags(caps: SourceCapabilities): string[] {
	const tags: string[] = [];
	if (caps.usesJs) tags.push("JS");
	if (caps.usesCookieJar) tags.push("Cookie");
	if (caps.usesWebView) tags.push("WebView");
	if (caps.usesMultiPage) tags.push("MultiPage");
	return tags;
}

function SourceListItem({
	source,
	capabilities,
	selected,
	onSelect,
	onToggleEnabled,
}: SourceListItemProps) {
	const domain =
		source.bookSourceUrl.replace(/https?:\/\//, "").split("/")[0] ?? "";
	const tags = getCapabilityTags(capabilities);

	return (
		<button
			type="button"
			onClick={() => onSelect(source.bookSourceUrl)}
			className={cn(
				"block w-full cursor-pointer border-b border-border px-3 py-2 text-left transition-colors",
				selected && "bg-surface-2 border-l-2 border-l-primary",
				!source.enabled && "opacity-60",
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="truncate text-sm font-medium">
					{source.bookSourceName}
				</span>
				<Switch
					checked={source.enabled}
					onCheckedChange={(checked: boolean) => {
						onToggleEnabled(source.bookSourceUrl, checked);
					}}
					onClick={(e) => e.stopPropagation()}
					size="sm"
					aria-label={source.enabled ? "禁用" : "启用"}
				/>
			</div>
			<div className="mt-0.5 text-xs text-muted-foreground">{domain}</div>
			{tags.length > 0 && (
				<div className="mt-1 flex gap-1">
					{tags.map((tag) => (
						<Badge
							key={tag}
							variant="secondary"
							className="px-1.5 py-0 text-[0.65rem]"
						>
							{tag}
						</Badge>
					))}
				</div>
			)}
		</button>
	);
}

export { SourceListItem };
