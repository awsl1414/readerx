"use client";

import { FileTextIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type RuleEmptyStateProps = {
	readonly onAdd: () => void;
	readonly i18nNamespace: string;
};

function RuleEmptyState({ onAdd, i18nNamespace }: RuleEmptyStateProps) {
	const t = useTranslations(i18nNamespace);

	return (
		<div className="flex flex-col items-center justify-center px-6 py-12 text-center">
			<div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
				<FileTextIcon className="text-muted-foreground size-6" />
			</div>
			<p className="text-foreground mb-1 text-sm font-medium">
				{t("emptyTitle")}
			</p>
			<p className="text-muted-foreground mb-6 text-xs">
				{t("emptyDescription")}
			</p>
			<Button size="sm" onClick={onAdd}>
				<PlusIcon />
				{t("addRule")}
			</Button>
		</div>
	);
}

export { RuleEmptyState };
