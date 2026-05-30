import type { AtmospherePreset } from "../types";
import { cn } from "@/lib/cn";

type AtmospherePickerProps = {
	readonly current: AtmospherePreset;
	readonly onSelect: (preset: AtmospherePreset) => void;
};

const PRESETS: readonly {
	key: AtmospherePreset;
	icon: string;
	label: string;
}[] = [
	{ key: "novel", icon: "Aa", label: "小说" },
	{ key: "focus", icon: "T", label: "专注" },
	{ key: "dense", icon: "≡", label: "密集" },
];

function AtmospherePicker({ current, onSelect }: AtmospherePickerProps) {
	return (
		<div className="flex gap-3 justify-center text-base">
			{PRESETS.map((p) => (
				<button
					key={p.key}
					type="button"
					onClick={() => onSelect(p.key)}
					title={p.label}
					className={cn(
						"bg-transparent border-none cursor-pointer pb-0.5 text-inherit transition-opacity",
						current === p.key
							? "opacity-100 border-b border-current"
							: "opacity-30",
					)}
				>
					{p.icon}
				</button>
			))}
		</div>
	);
}

export type { AtmospherePickerProps };
export { AtmospherePicker };
