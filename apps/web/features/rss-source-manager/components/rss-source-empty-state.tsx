"use client";

import { Plus, Rss } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type RssSourceEmptyStateProps = {
	readonly onImport: () => void;
};

function RssSourceEmptyState({ onImport }: RssSourceEmptyStateProps) {
	const t = useTranslations("rssSourceManager");

	return (
		<div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
			<div className="flex size-16 items-center justify-center rounded-full bg-surface-2">
				<Rss className="size-8 text-muted-foreground" />
			</div>
			<h3 className="text-base font-medium">{t("emptyTitle")}</h3>
			<p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
			<Button onClick={onImport} size="sm">
				<Plus className="size-4" />
				{t("emptyImport")}
			</Button>
		</div>
	);
}

export { RssSourceEmptyState };
