"use client";

import { BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function EmptyBookshelf() {
	const t = useTranslations("bookshelf");

	return (
		<div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
			<div className="flex size-16 items-center justify-center rounded-full bg-surface-2">
				<BookOpen className="size-8 text-muted-foreground" />
			</div>
			<h2 className="text-lg font-medium">{t("noBooks")}</h2>
			<p className="text-sm text-muted-foreground">{t("noBooksHint")}</p>
			<Link href="/search">
				<Button variant="outline" size="sm">
					<Search className="size-4" />
					{t("noBooksHint")}
				</Button>
			</Link>
		</div>
	);
}
