// features/source-manager/components/rule-section.tsx

"use client";

type RuleSectionProps = {
	readonly title: string;
	readonly sectionKey: string;
	readonly expanded: boolean;
	readonly onToggle: (sectionKey: string) => void;
	readonly children: React.ReactNode;
};

function RuleSection({
	title,
	sectionKey,
	expanded,
	onToggle,
	children,
}: RuleSectionProps) {
	return (
		<div style={{ borderBottom: "1px solid oklch(0.2 0 0)" }}>
			<button
				type="button"
				onClick={() => onToggle(sectionKey)}
				style={{
					width: "100%",
					padding: "10px 16px",
					background: "transparent",
					border: "none",
					color: "oklch(0.85 0 0)",
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					gap: 8,
					fontSize: "0.9rem",
					fontWeight: 500,
					textAlign: "left",
				}}
			>
				<span
					style={{
						transition: "transform 0.15s",
						transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
						display: "inline-block",
					}}
				>
					▶
				</span>
				{title}
			</button>
			{expanded && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
		</div>
	);
}

export { RuleSection };
