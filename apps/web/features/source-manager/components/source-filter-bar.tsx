// features/source-manager/components/source-filter-bar.tsx

"use client";

import { useCallback, useRef } from "react";
import type { FilterMode } from "../types";

type SourceFilterBarProps = {
	readonly filterMode: FilterMode;
	readonly searchQuery: string;
	readonly onFilterChange: (mode: FilterMode) => void;
	readonly onSearchChange: (query: string) => void;
	readonly onImport: () => void;
};

const FILTER_OPTIONS: Array<{ value: FilterMode; label: string }> = [
	{ value: "all", label: "全部" },
	{ value: "enabled", label: "已启用" },
	{ value: "disabled", label: "已禁用" },
	{ value: "error", label: "异常" },
];

function SourceFilterBar({
	filterMode,
	searchQuery,
	onFilterChange,
	onSearchChange,
	onImport,
}: SourceFilterBarProps) {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleSearch = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => onSearchChange(value), 300);
		},
		[onSearchChange],
	);

	return (
		<div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
			<input
				type="search"
				placeholder="搜索书源..."
				defaultValue={searchQuery}
				onChange={handleSearch}
				style={{
					width: "100%",
					padding: "6px 10px",
					borderRadius: 6,
					border: "1px solid oklch(0.3 0 0)",
					background: "oklch(0.12 0 0)",
					color: "oklch(0.9 0 0)",
					fontSize: "0.875rem",
					boxSizing: "border-box",
				}}
			/>
			<div style={{ display: "flex", gap: 4 }}>
				{FILTER_OPTIONS.map((opt) => (
					<button
						key={opt.value}
						type="button"
						onClick={() => onFilterChange(opt.value)}
						style={{
							padding: "3px 10px",
							borderRadius: 4,
							border: "none",
							background:
								filterMode === opt.value
									? "oklch(0.3 0.1 250)"
									: "transparent",
							color:
								filterMode === opt.value
									? "oklch(0.9 0.1 250)"
									: "oklch(0.6 0 0)",
							cursor: "pointer",
							fontSize: "0.8rem",
						}}
					>
						{opt.label}
					</button>
				))}
			</div>
			<button
				type="button"
				onClick={onImport}
				style={{
					padding: "6px 12px",
					borderRadius: 6,
					border: "1px solid oklch(0.3 0.05 250)",
					background: "transparent",
					color: "oklch(0.7 0.1 250)",
					cursor: "pointer",
					fontSize: "0.8rem",
					width: "100%",
				}}
			>
				+ 导入书源
			</button>
		</div>
	);
}

export { SourceFilterBar };
