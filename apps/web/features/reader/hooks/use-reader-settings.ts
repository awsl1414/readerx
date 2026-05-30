"use client";

import { useCallback, useEffect, useState } from "react";
import { settingsStorage } from "@/lib/settings-storage";
import { FONT_PRESETS } from "../atmosphere";
import type { ReaderFontPreset, ReaderTheme } from "../types";

type ReaderSettings = {
	readonly theme: ReaderTheme;
	readonly font: ReaderFontPreset;
	readonly fontSize: number;
	readonly lineHeight: number;
	readonly paragraphSpacing: number;
	readonly contentWidth: number;
	readonly textIndent: string;
	readonly textAlign: "left" | "justify";
};

const STORAGE_KEY = "readerx:reader-settings";

const DEFAULT_SETTINGS: ReaderSettings = {
	theme: "warm-white",
	font: "serif",
	fontSize: 17,
	lineHeight: 1.9,
	paragraphSpacing: 1.2,
	contentWidth: 680,
	textIndent: "2em",
	textAlign: "justify",
};

function loadSettings(): ReaderSettings {
	const stored = settingsStorage.get<Partial<ReaderSettings>>(STORAGE_KEY, {});
	return { ...DEFAULT_SETTINGS, ...stored };
}

function useReaderSettings() {
	const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
	const [mounted, setMounted] = useState(false);

	// Read from localStorage after hydration to avoid mismatch
	useEffect(() => {
		setSettings(loadSettings());
		setMounted(true);
	}, []);

	const updateSettings = useCallback((partial: Partial<ReaderSettings>) => {
		setSettings((prev) => {
			const next = { ...prev, ...partial };
			settingsStorage.set(STORAGE_KEY, next);
			return next;
		});
	}, []);

	return { mounted, settings, updateSettings };
}

export type { ReaderFontPreset, ReaderSettings };
export { DEFAULT_SETTINGS, FONT_PRESETS, useReaderSettings };
