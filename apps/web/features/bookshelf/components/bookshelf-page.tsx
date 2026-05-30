"use client";

import { useTranslations } from "next-intl";
import { useBooks } from "../hooks/use-books";
import { useBookshelfStore } from "../store";
import { BookGrid } from "./book-grid";
import { ContinueReadingHero } from "./continue-reading-hero";
import { GroupChips } from "./group-chips";

export function BookshelfPage() {
	const t = useTranslations("bookshelf");
	const tc = useTranslations("common");
	const sortBy = useBookshelfStore((s) => s.sortBy);
	const selectedGroupId = useBookshelfStore((s) => s.selectedGroupId);

	const groupIdNum = selectedGroupId !== null ? Number(selectedGroupId) : null;
	const { data: books, isLoading } = useBooks(groupIdNum, sortBy);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="text-muted-foreground">{tc("loading")}</div>
			</div>
		);
	}

	const allBooks = books ?? [];
	const lastReadBook =
		allBooks.length > 0 && sortBy === "recentRead" ? allBooks[0] : undefined;

	return (
		<div className="space-y-6">
			{lastReadBook && (
				<section>
					<h2 className="mb-3 text-sm font-medium text-muted-foreground">
						{t("continueReading")}
					</h2>
					<ContinueReadingHero book={lastReadBook} />
				</section>
			)}

			<section>
				<GroupChips />
			</section>

			<section>
				<BookGrid books={allBooks} />
			</section>
		</div>
	);
}
