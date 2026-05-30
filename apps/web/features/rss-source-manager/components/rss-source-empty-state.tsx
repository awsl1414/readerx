"use client";

import { Rss } from "lucide-react";
import { useTranslations } from "next-intl";

function RssSourceEmptyState() {
	const t = useTranslations("rssSourceManager");

	return (
		<div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
			<div className="flex size-16 items-center justify-center rounded-full bg-surface-2">
				<Rss className="size-8 text-muted-foreground" />
			</div>
			<h3 className="text-base font-medium">{t("emptyTitle")}</h3>
			<p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
		</div>
	);
}

export { RssSourceEmptyState };
