"use client";

import {
	BarChart3,
	BookA,
	BookMarked,
	Bookmark,
	BookOpen,
	Database,
	Download,
	FileText,
	Info,
	Palette,
	Regex,
	Rss,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

type SettingSection = {
	readonly titleKey: string;
	readonly items: readonly SettingItem[];
};

type SettingItem = {
	readonly href: string;
	readonly icon: React.ComponentType<{ className?: string }>;
	readonly labelKey: string;
};

const sections: readonly SettingSection[] = [
	{
		titleKey: "sectionRules",
		items: [
			{ href: "/my/sources", icon: BookOpen, labelKey: "sources" },
			{ href: "/my/rss-sources", icon: Rss, labelKey: "rssSources" },
			{ href: "/my/replace-rules", icon: Regex, labelKey: "replaceRules" },
			{ href: "/my/txt-rules", icon: FileText, labelKey: "txtRules" },
			{ href: "/my/dict-rules", icon: BookA, labelKey: "dictRules" },
		],
	},
	{
		titleKey: "sectionPersonal",
		items: [
			{ href: "/my/theme", icon: Palette, labelKey: "theme" },
			{ href: "/my/reading", icon: BookMarked, labelKey: "reading" },
		],
	},
	{
		titleKey: "sectionData",
		items: [
			{ href: "/my/backup", icon: Database, labelKey: "backup" },
			{ href: "/my/import", icon: Database, labelKey: "import" },
			{ href: "/my/downloads", icon: Download, labelKey: "downloads" },
		],
	},
	{
		titleKey: "sectionStats",
		items: [
			{ href: "/my/bookmarks", icon: Bookmark, labelKey: "bookmarks" },
			{ href: "/my/read-record", icon: BarChart3, labelKey: "readRecord" },
		],
	},
	{
		titleKey: "sectionOther",
		items: [{ href: "/my/about", icon: Info, labelKey: "about" }],
	},
];

export default function MyPage() {
	const t = useTranslations("my");

	return (
		<div className="mx-auto max-w-lg space-y-6">
			<h1 className="text-2xl font-semibold">{t("title")}</h1>
			{sections.map((section) => (
				<div key={section.titleKey}>
					<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t(section.titleKey)}
					</h2>
					<div className="divide-y divide-border rounded-lg border border-border bg-surface-1">
						{section.items.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"flex items-center gap-3 px-4 py-3 text-sm transition-colors",
									"hover:bg-surface-2 first:rounded-t-lg last:rounded-b-lg",
								)}
							>
								<item.icon className="size-4 text-muted-foreground" />
								<span className="flex-1">{t(item.labelKey)}</span>
								<span className="text-muted-foreground">›</span>
							</Link>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
