"use client";

import { Plus, Rss, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type RssSourceEmptyStateProps = {
	readonly onImport: () => void;
	readonly onAdd: () => void;
};

function RssSourceEmptyState({ onImport, onAdd }: RssSourceEmptyStateProps) {
	const t = useTranslations("rssSourceManager");

	return (
		<div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
			<div className="flex size-16 items-center justify-center rounded-full bg-surface-2">
				<Rss className="size-8 text-muted-foreground" />
			</div>
			<h3 className="text-base font-medium">{t("emptyTitle")}</h3>
			<p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
			<div className="flex gap-2">
				<Button variant="outline" size="sm" onClick={onImport}>
					<UploadIcon className="size-3.5" />
					{t("emptyImport")}
				</Button>
				<Button size="sm" onClick={onAdd}>
					<Plus className="size-3.5" />
					{t("emptyAdd")}
				</Button>
			</div>
		</div>
	);
}

export { RssSourceEmptyState };
