"use client";

import { BookOpen, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type SourceEmptyStateProps = {
	readonly onImport: () => void;
};

function SourceEmptyState({ onImport }: SourceEmptyStateProps) {
	const t = useTranslations("sourceManager");

	return (
		<div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
			<div className="flex size-16 items-center justify-center rounded-full bg-surface-2">
				<BookOpen className="size-8 text-muted-foreground" />
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

export { SourceEmptyState };
