import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "ReaderX",
	description: "私人阅读空间",
};

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme:dark)").matches);document.documentElement.classList.add(d?"dark":"light")}catch(e){}})()`;

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const locale = await getLocale();
	const messages = await getMessages();

	return (
		<html
			lang={locale}
			suppressHydrationWarning
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-dvh">
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: 内联主题检测脚本，内容为硬编码常量，无 XSS 风险 */}
				<script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
				<NextIntlClientProvider messages={messages}>
					<ThemeProvider defaultTheme="system">
						<Providers>
							<AppShell>{children}</AppShell>
						</Providers>
					</ThemeProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
