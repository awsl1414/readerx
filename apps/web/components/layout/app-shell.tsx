"use client";

import { Moon, Sun, Search } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DesktopNav, MobileNav } from "./nav-items";

export function AppShell({ children }: { children: React.ReactNode }) {
	const { setTheme, resolvedTheme } = useTheme();

	return (
		<div className="flex min-h-dvh">
			<DesktopNav />
			<div className="flex flex-1 flex-col">
				<header className="sticky top-0 z-20 flex h-11 items-center justify-between px-4 backdrop-blur-xl bg-background/80">
					<div className="w-14" />
					<div className="flex items-center gap-1">
						<Link href="/search">
							<Button
								variant="ghost"
								size="icon-sm"
								className="text-muted-foreground"
							>
								<Search className="size-4" />
							</Button>
						</Link>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() =>
								setTheme(resolvedTheme === "dark" ? "light" : "dark")
							}
							className="text-muted-foreground"
						>
							<Sun className="size-4 scale-100 rotate-0 dark:scale-0 dark:-rotate-90 transition-transform" />
							<Moon className="size-4 scale-0 rotate-90 dark:scale-100 dark:rotate-0 transition-transform" />
						</Button>
					</div>
				</header>
				<main className="flex-1 px-4 pb-20 md:px-6 md:pb-6 lg:px-8">
					{children}
				</main>
			</div>
			<MobileNav />
		</div>
	);
}
