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
};

const NAV_ITEMS: readonly NavItem[] = [
	{ href: "/", label: "bookshelf", icon: BookOpen },
	{ href: "/explore", label: "explore", icon: Compass },
	{ href: "/subscriptions", label: "subscriptions", icon: Rss },
	{ href: "/my", label: "my", icon: User },
];

export function DesktopNav() {
	const t = useTranslations("nav");
	const pathname = usePathname();

	return (
		<aside className="hidden w-14 shrink-0 flex-col items-center py-4 md:flex">
			<nav className="flex flex-col items-center gap-1 px-2">
				{NAV_ITEMS.map((item) => {
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

	return (
		<nav
			className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border/40 bg-background/80 md:hidden"
			style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
		>
			{NAV_ITEMS.map((item) => {
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
