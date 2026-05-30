"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type BookCardProps = {
	readonly bookUrl: string;
	readonly name: string;
	readonly author: string;
	readonly coverUrl: string | null;
	readonly progress: number;
};

export function BookCard({
	bookUrl,
	name,
	author,
	coverUrl,
	progress,
}: BookCardProps) {
	return (
		<Link
			href={`/reader/${encodeURIComponent(bookUrl)}`}
			className="group flex flex-col gap-1.5"
		>
			<div
				className={cn(
					"relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-2",
					"transition-transform group-hover:scale-[1.02]",
				)}
			>
				{coverUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={coverUrl}
						alt={name}
						className="h-full w-full object-cover"
						loading="lazy"
					/>
				) : (
					<div className="flex h-full items-center justify-center">
						<BookOpen className="size-8 text-muted-foreground/50" />
					</div>
				)}
				{progress > 0 && (
					<div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5 text-center text-xs text-white">
						{progress}%
					</div>
				)}
			</div>
			<div className="min-w-0">
				<p className="truncate text-sm font-medium leading-tight">{name}</p>
				<p className="truncate text-xs text-muted-foreground">{author}</p>
			</div>
		</Link>
	);
}
