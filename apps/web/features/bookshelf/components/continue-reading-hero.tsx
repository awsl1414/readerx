"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import type { BookForList } from "../hooks/use-books";

type ContinueReadingHeroProps = {
	readonly book: BookForList;
};

export function ContinueReadingHero({ book }: ContinueReadingHeroProps) {
	const progress =
		book.totalChapterNum > 0
			? Math.round((book.durChapterIndex / book.totalChapterNum) * 100)
			: 0;

	return (
		<Link
			href={`/reader/${encodeURIComponent(book.bookUrl)}`}
			className="group flex gap-4 rounded-xl bg-surface-2 p-4 transition-colors hover:bg-surface-3"
		>
			<div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-3">
				{book.coverUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={book.coverUrl}
						alt={book.name}
						className="h-full w-full object-cover"
						loading="lazy"
					/>
				) : (
					<BookOpen className="size-8 text-muted-foreground/50" />
				)}
			</div>
			<div className="flex min-w-0 flex-1 flex-col justify-center">
				<h2 className="truncate text-base font-semibold">{book.name}</h2>
				<p className="truncate text-sm text-muted-foreground">{book.author}</p>
				{book.durChapterTitle && (
					<p className="mt-1 truncate text-xs text-muted-foreground">
						{book.durChapterTitle}
					</p>
				)}
				<div className="mt-2 flex items-center gap-2">
					<div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
						<div
							className="h-full rounded-full bg-primary transition-all"
							style={{ width: `${progress}%` }}
						/>
					</div>
					<span className="text-xs text-muted-foreground">{progress}%</span>
				</div>
			</div>
		</Link>
	);
}
