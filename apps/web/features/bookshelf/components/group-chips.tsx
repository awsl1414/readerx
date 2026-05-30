"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useBookGroups } from "../hooks/use-book-groups";
import { useBookshelfStore } from "../store";

export function GroupChips() {
	const t = useTranslations("bookshelf");
	const selectedGroupId = useBookshelfStore((s) => s.selectedGroupId);
	const setSelectedGroupId = useBookshelfStore((s) => s.setSelectedGroupId);
	const { data: groups } = useBookGroups();

	if (!groups || groups.length === 0) return null;

	return (
		<div className="flex gap-2 overflow-x-auto pb-1">
			<button
				type="button"
				onClick={() => setSelectedGroupId(null)}
				className={cn(
					"shrink-0 rounded-full px-3 py-1 text-sm transition-colors",
					selectedGroupId === null
						? "bg-primary text-primary-foreground"
						: "bg-surface-2 text-muted-foreground hover:text-foreground",
				)}
			>
				{t("allBooks")}
			</button>
			{groups.map((group) => (
				<button
					key={group.groupId}
					type="button"
					onClick={() => setSelectedGroupId(String(group.groupId))}
					className={cn(
						"shrink-0 rounded-full px-3 py-1 text-sm transition-colors",
						selectedGroupId === String(group.groupId)
							? "bg-primary text-primary-foreground"
							: "bg-surface-2 text-muted-foreground hover:text-foreground",
					)}
				>
					{group.groupName}
				</button>
			))}
		</div>
	);
}
