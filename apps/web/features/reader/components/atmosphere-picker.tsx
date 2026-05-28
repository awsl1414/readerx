import type { AtmospherePreset } from "../types";

type AtmospherePickerProps = {
	readonly current: AtmospherePreset;
	readonly onSelect: (preset: AtmospherePreset) => void;
};

const PRESETS: readonly { key: AtmospherePreset; icon: string; label: string }[] = [
	{ key: "novel", icon: "Aa", label: "小说" },
	{ key: "focus", icon: "T", label: "专注" },
	{ key: "dense", icon: "≡", label: "密集" },
];

function AtmospherePicker({ current, onSelect }: AtmospherePickerProps) {
	return (
		<div style={{
			display: "flex",
			gap: 12,
			justifyContent: "center",
			fontSize: 16,
		}}>
			{PRESETS.map((p) => (
				<button
					key={p.key}
					type="button"
					onClick={() => onSelect(p.key)}
					title={p.label}
					style={{
						background: "none",
						border: "none",
						cursor: "pointer",
						opacity: current === p.key ? 1 : 0.3,
						borderBottom: current === p.key ? "1px solid currentColor" : "none",
						paddingBottom: 2,
						fontSize: "inherit",
						color: "inherit",
					}}
				>
					{p.icon}
				</button>
			))}
		</div>
	);
}

export { AtmospherePicker };
export type { AtmospherePickerProps };
