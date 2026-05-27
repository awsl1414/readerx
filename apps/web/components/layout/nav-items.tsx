"use client";

import { BookOpen, Home, Library, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

const items = [
	{ href: "/", label: "home", icon: Home },
	{ href: "/library", label: "library", icon: Library },
	{ href: "/search", label: "search", icon: Search },
	{ href: "/settings", label: "settings", icon: Settings },
] as const;

export function DesktopNav() {
	const t = useTranslations("nav");
	const pathname = usePathname();

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
