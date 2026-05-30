"use client";

import { BookOpen, Compass, Rss, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

type NavItem = {
	readonly href: string;
	readonly label: string;
	readonly icon: React.ComponentType<{ className?: string }>;
	readonly alwaysVisible: boolean;
};

const navItems: readonly NavItem[] = [
	{ href: "/", label: "bookshelf", icon: BookOpen, alwaysVisible: true },
	{ href: "/explore", label: "explore", icon: Compass, alwaysVisible: false },
	{
		href: "/subscriptions",
		label: "subscriptions",
		icon: Rss,
		alwaysVisible: false,
	},
	{ href: "/my", label: "my", icon: User, alwaysVisible: true },
] as const;

/**
 * Hook to determine which nav items should be visible.
 * "发现" shows when at least one book source has exploreUrl.
 * "订阅" shows when at least one RSS source exists.
 * For now: always show all items until persistence hooks are wired.
 * TODO: implement smart show/hide based on data availability.
 */
function useVisibleNavItems(): readonly NavItem[] {
	// MVP: show all 4 tabs always. Smart show/hide comes in P2.
	return navItems;
}

export function DesktopNav() {
	const t = useTranslations("nav");
	const pathname = usePathname();
	const items = useVisibleNavItems();

	return (
		<aside className="hidden w-14 shrink-0 flex-col py-4 md:flex">
			<Link href="/" className="flex items-center justify-center py-3">
				<BookOpen className="size-5 text-foreground" />
			</Link>
			<nav className="mt-2 flex flex-col items-center gap-1 px-2">
				{items.map((item) => {
					const active =
						item.href === "/"
							? pathname === "/"
							: pathname.startsWith(item.href);
					return (
						<Link
							key={item.href}
							href={item.href}
							title={t(item.label)}
							className={cn(
								"flex size-10 items-center justify-center rounded-lg transition-colors",
								active
									? "text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<item.icon className="size-5" />
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}

export function MobileNav() {
	const t = useTranslations("nav");
	const pathname = usePathname();
	const items = useVisibleNavItems();

	return (
		<nav
			className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border/40 bg-background/80 md:hidden"
			style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
		>
			{items.map((item) => {
				const active =
					item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
				return (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors",
							active ? "text-foreground" : "text-muted-foreground",
						)}
					>
						<item.icon className="size-5" />
						<span>{t(item.label)}</span>
					</Link>
				);
			})}
		</nav>
	);
}
