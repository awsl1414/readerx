// features/source-manager/components/source-empty-state.tsx

"use client";

type SourceEmptyStateProps = {
	readonly onImport: () => void;
};

function SourceEmptyState({ onImport }: SourceEmptyStateProps) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "48px 24px",
				textAlign: "center",
			}}
		>
			<p style={{ fontSize: "1rem", color: "oklch(0.7 0 0)", marginBottom: 16 }}>
				还没有书源。导入书源后即可开始搜索和阅读。
			</p>
			<button
				type="button"
				onClick={onImport}
				style={{
					padding: "8px 20px",
					borderRadius: 8,
					background: "oklch(0.5 0.2 250)",
					color: "white",
					border: "none",
					cursor: "pointer",
					fontSize: "0.875rem",
				}}
			>
				+ 导入书源
			</button>
		</div>
	);
}

export { SourceEmptyState };
