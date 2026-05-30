"use client";

import type { RssSourceRecord } from "@readerx/persistence";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

type RssSourceListItemProps = {
	readonly source: RssSourceRecord;
	readonly selected: boolean;
	readonly onSelect: (url: string) => void;
	readonly onToggleEnabled: (url: string, enabled: boolean) => void;
};

function RssSourceListItem({
	source,
	selected,
	onSelect,
	onToggleEnabled,
}: RssSourceListItemProps) {
	const domain =
		source.sourceUrl.replace(/https?:\/\//, "").split("/")[0] ?? "";

	return (
		<button
			type="button"
			onClick={() => onSelect(source.sourceUrl)}
			className={cn(
				"block w-full cursor-pointer border-b border-border px-3 py-2 text-left transition-colors",
				selected && "bg-surface-2 border-l-2 border-l-primary",
				!source.enabled && "opacity-60",
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="truncate text-sm font-medium">
					{source.sourceName}
				</span>
				<Switch
					checked={source.enabled}
					onCheckedChange={(checked: boolean) => {
						onToggleEnabled(source.sourceUrl, checked);
					}}
					onClick={(e) => e.stopPropagation()}
					size="sm"
					aria-label={source.enabled ? "Disable" : "Enable"}
				/>
			</div>
			<div className="mt-0.5 text-xs text-muted-foreground">{domain}</div>
			{source.sourceGroup && (
				<div className="mt-1 flex gap-1">
					<Badge variant="secondary" className="px-1.5 py-0 text-[0.65rem]">
						{source.sourceGroup}
					</Badge>
				</div>
			)}
		</button>
	);
}

export { RssSourceListItem };
