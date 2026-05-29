// features/source-manager/components/source-list-item.tsx

"use client";

import type { BookSourceRecord } from "@readerx/persistence";
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
	const domain = source.bookSourceUrl.replace(/https?:\/\//, "").split("/")[0] ?? "";
	const tags = getCapabilityTags(capabilities);

	return (
		<div
			onClick={() => onSelect(source.bookSourceUrl)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect(source.bookSourceUrl);
				}
			}}
			role="button"
			tabIndex={0}
			style={{
				padding: "8px 12px",
				cursor: "pointer",
				background: selected ? "oklch(0.2 0.03 250)" : "transparent",
				borderBottom: "1px solid oklch(0.2 0 0)",
				opacity: source.enabled ? 1 : 0.6,
			}}
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<span
					style={{
						fontSize: "0.875rem",
						fontWeight: 500,
						color: "oklch(0.9 0 0)",
					}}
				>
					{source.bookSourceName}
				</span>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onToggleEnabled(source.bookSourceUrl, !source.enabled);
					}}
					aria-label={source.enabled ? "禁用" : "启用"}
					style={{
						width: 36,
						height: 20,
						borderRadius: 10,
						border: "none",
						background: source.enabled
							? "oklch(0.6 0.2 150)"
							: "oklch(0.3 0 0)",
						cursor: "pointer",
						position: "relative",
					}}
				>
					<span
						style={{
							position: "absolute",
							top: 2,
							left: source.enabled ? 18 : 2,
							width: 16,
							height: 16,
							borderRadius: 8,
							background: "white",
							transition: "left 0.15s",
						}}
					/>
				</button>
			</div>
			<div style={{ marginTop: 2, fontSize: "0.75rem", color: "oklch(0.5 0 0)" }}>
				{domain}
			</div>
			{tags.length > 0 && (
				<div style={{ display: "flex", gap: 4, marginTop: 4 }}>
					{tags.map((tag) => (
						<span
							key={tag}
							style={{
								padding: "1px 6px",
								borderRadius: 3,
								background: "oklch(0.2 0.03 250)",
								color: "oklch(0.7 0.1 250)",
								fontSize: "0.7rem",
							}}
						>
							{tag}
						</span>
					))}
				</div>
			)}
		</div>
	);
}

export { SourceListItem };
