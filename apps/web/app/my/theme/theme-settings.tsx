"use client";

import { AlignJustify, AlignLeft, Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/components/theme-provider";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { ReaderFontPreset } from "@/features/reader/hooks/use-reader-settings";
import {
	FONT_PRESETS,
	useReaderSettings,
} from "@/features/reader/hooks/use-reader-settings";
import type { ReaderTheme } from "@/features/reader/types";
import { cn } from "@/lib/cn";

/* ─── SegmentedControl: 分段控件 ─── */
type SegmentedOption<T extends string> = {
	readonly value: T;
	readonly label: string;
	readonly icon?: React.ComponentType<{ className?: string }>;
};

function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
}: {
	readonly options: readonly SegmentedOption<T>[];
	readonly value: T;
	readonly onChange: (value: T) => void;
}) {
	return (
		<div className="inline-flex rounded-lg bg-surface-0 p-0.5">
			{options.map((opt) => {
				const Icon = opt.icon;
				const active = value === opt.value;
				return (
					<button
						key={opt.value}
						type="button"
						onClick={() => onChange(opt.value)}
						className={cn(
							"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-all",
							active
								? "bg-surface-2 text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{Icon && <Icon className="size-3.5" />}
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}

/* ─── SliderField ─── */
type SliderFieldProps = {
	readonly label: string;
	readonly value: number;
	readonly min: number;
	readonly max: number;
	readonly step: number;
	readonly unit?: string;
	readonly onChange: (value: number) => void;
};

function SliderField({
	label,
	value,
	min,
	max,
	step,
	unit,
	onChange,
}: SliderFieldProps) {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label className="text-sm">{label}</Label>
				<span className="text-sm tabular-nums text-muted-foreground">
					{Number.isInteger(step) ? value : value.toFixed(1)}
					{unit ?? ""}
				</span>
			</div>
			<Slider
				value={[value]}
				min={min}
				max={max}
				step={step}
				onValueChange={(vals) => {
					const v = vals[0];
					if (v !== undefined) onChange(v);
				}}
			/>
		</div>
	);
}

/* ─── Data ─── */
const READER_THEMES: readonly {
	readonly key: ReaderTheme;
	readonly bgClass: string;
	readonly textClass: string;
	readonly labelKey: string;
}[] = [
	{
		key: "warm-white",
		bgClass: "bg-[oklch(0.98_0.005_80)]",
		textClass: "text-[oklch(0.30_0.01_60)]",
		labelKey: "warmWhite",
	},
	{
		key: "beige",
		bgClass: "bg-[oklch(0.93_0.02_80)]",
		textClass: "text-[oklch(0.28_0.02_60)]",
		labelKey: "beige",
	},
	{
		key: "green",
		bgClass: "bg-[oklch(0.92_0.03_155)]",
		textClass: "text-[oklch(0.25_0.02_140)]",
		labelKey: "green",
	},
	{
		key: "sepia",
		bgClass: "bg-[oklch(0.25_0.03_60)]",
		textClass: "text-[oklch(0.75_0.03_70)]",
		labelKey: "sepia",
	},
	{
		key: "black",
		bgClass: "bg-[oklch(0.12_0_0)]",
		textClass: "text-[oklch(0.65_0_0)]",
		labelKey: "black",
	},
];

const PREVIEW_TEXT =
	"天地有大美而不言，四时有明法而不议，万物有成理而不说。圣人者，原天地之美而达万物之理。";

/* ─── Main Component ─── */
export function ThemeSettings() {
	const t = useTranslations("my");
	const { theme, setTheme } = useTheme();
	const { settings, updateSettings } = useReaderSettings();

	const fontFamily =
		FONT_PRESETS[settings.font as ReaderFontPreset] ?? FONT_PRESETS.serif;

	return (
		<div className="space-y-6">
			{/* Section 1: Appearance Mode */}
			<section>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("appearance")}
				</h2>
				<div className="grid grid-cols-3 gap-2">
					{(
						[
							{ value: "light", icon: Sun, label: t("light") },
							{ value: "dark", icon: Moon, label: t("dark") },
							{ value: "system", icon: Monitor, label: t("system") },
						] as const
					).map(({ value, icon: Icon, label }) => (
						<button
							key={value}
							type="button"
							onClick={() => setTheme(value)}
							className={cn(
								"flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm transition-colors",
								theme === value
									? "border-primary bg-primary/10 text-primary"
									: "border-border bg-surface-1 hover:bg-surface-2",
							)}
						>
							<Icon className="size-5" />
							<span>{label}</span>
						</button>
					))}
				</div>
			</section>

			{/* Section 2: Reader Theme */}
			<section>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("readerTheme")}
				</h2>
				<div className="flex gap-3">
					{READER_THEMES.map(({ key, bgClass, textClass, labelKey }) => (
						<button
							type="button"
							key={key}
							onClick={() => updateSettings({ theme: key })}
							className={cn(
								"flex flex-1 flex-col items-center gap-1.5 rounded-lg p-1.5 transition-all",
								settings.theme === key
									? "ring-2 ring-primary ring-offset-2 ring-offset-background"
									: "ring-1 ring-border hover:ring-primary/40",
							)}
						>
							<div
								className={cn(
									"h-10 w-full rounded-md",
									bgClass,
									"flex items-center justify-center",
									textClass,
								)}
							>
								<span className="text-xs font-medium">Aa</span>
							</div>
							<span className="text-[11px] text-muted-foreground">
								{t(labelKey)}
							</span>
						</button>
					))}
				</div>
			</section>

			{/* Section 3: Typography */}
			<section>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("typography")}
				</h2>
				<div className="space-y-4 rounded-lg border border-border bg-surface-1 p-4">
					{/* Font — segmented control */}
					<div className="flex items-center justify-between">
						<Label className="text-sm">{t("font")}</Label>
						<SegmentedControl
							options={[
								{ value: "system", label: t("fontSystem") },
								{ value: "serif", label: t("fontSerif") },
								{ value: "sans", label: t("fontSans") },
							]}
							value={settings.font}
							onChange={(v) => updateSettings({ font: v })}
						/>
					</div>

					{/* Font size */}
					<SliderField
						label={t("fontSize")}
						value={settings.fontSize}
						min={14}
						max={24}
						step={1}
						unit="px"
						onChange={(v) => updateSettings({ fontSize: v })}
					/>

					{/* Line height */}
					<SliderField
						label={t("lineHeight")}
						value={settings.lineHeight}
						min={1.5}
						max={2.5}
						step={0.1}
						onChange={(v) => updateSettings({ lineHeight: v })}
					/>

					{/* Paragraph spacing */}
					<SliderField
						label={t("paragraphSpacing")}
						value={settings.paragraphSpacing}
						min={0.5}
						max={2.0}
						step={0.1}
						onChange={(v) => updateSettings({ paragraphSpacing: v })}
					/>

					{/* Content width */}
					<SliderField
						label={t("contentWidth")}
						value={settings.contentWidth}
						min={480}
						max={900}
						step={20}
						unit="px"
						onChange={(v) => updateSettings({ contentWidth: v })}
					/>

					{/* Text indent — segmented control */}
					<div className="flex items-center justify-between">
						<Label className="text-sm">{t("textIndent")}</Label>
						<SegmentedControl
							options={[
								{ value: "0", label: t("noIndent") },
								{ value: "2em", label: t("indent2em") },
							]}
							value={settings.textIndent}
							onChange={(v) => updateSettings({ textIndent: v })}
						/>
					</div>

					{/* Text align — segmented control with icons */}
					<div className="flex items-center justify-between">
						<Label className="text-sm">{t("textAlign")}</Label>
						<SegmentedControl
							options={[
								{
									value: "left",
									label: t("alignLeft"),
									icon: AlignLeft,
								},
								{
									value: "justify",
									label: t("alignJustify"),
									icon: AlignJustify,
								},
							]}
							value={settings.textAlign}
							onChange={(v) =>
								updateSettings({ textAlign: v as "left" | "justify" })
							}
						/>
					</div>
				</div>
			</section>

			{/* Section 4: Live Preview */}
			<section>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("preview")}
				</h2>
				<div
					data-reader-theme={settings.theme}
					className="h-48 overflow-auto rounded-lg border border-border p-4"
					style={{
						fontFamily,
						fontSize: `${settings.fontSize}px`,
						lineHeight: settings.lineHeight,
						maxWidth: settings.contentWidth,
						margin: "0 auto",
					}}
				>
					<p
						style={{
							textIndent: settings.textIndent,
							textAlign: settings.textAlign,
							marginBottom: `${settings.paragraphSpacing}em`,
						}}
					>
						{PREVIEW_TEXT}
					</p>
					<p
						style={{
							textIndent: settings.textIndent,
							textAlign: settings.textAlign,
							marginBottom: `${settings.paragraphSpacing}em`,
						}}
					>
						{PREVIEW_TEXT}
					</p>
				</div>
			</section>
		</div>
	);
}
