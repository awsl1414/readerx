"use client";

import { BookCard } from "./book-card";
import { EmptyBookshelf } from "./empty-bookshelf";
import type { BookForList } from "../hooks/use-books";

type BookGridProps = {
	readonly books: readonly BookForList[];
};

export function BookGrid({ books }: BookGridProps) {
	if (books.length === 0) {
		return <EmptyBookshelf />;
	}

	return (
		<div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
			{books.map((book) => (
				<BookCard
					key={book.bookUrl}
					bookUrl={book.bookUrl}
					name={book.name}
					author={book.author}
					coverUrl={book.coverUrl}
					progress={
						book.totalChapterNum > 0
							? Math.round((book.durChapterIndex / book.totalChapterNum) * 100)
							: 0
					}
				/>
			))}
		</div>
	);
}
