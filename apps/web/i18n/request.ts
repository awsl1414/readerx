import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

function parseAcceptLanguage(header: string): string {
	const preferred = header.split(",").map((part) => {
		const segments = part.trim().split(";q=");
		const lang = segments[0]?.trim() ?? "";
		const raw = segments[1] ? Number.parseFloat(segments[1]) : 1;
		const priority = Number.isNaN(raw) ? 1 : raw;
		return { lang, priority };
	});
	preferred.sort((a, b) => b.priority - a.priority);
	const match = preferred.find(
		(p) => p.lang.startsWith("zh") || p.lang.startsWith("en"),
	);
	if (match?.lang.startsWith("zh")) return "zh";
	return "en";
}

export default getRequestConfig(async () => {
	const store = await cookies();
	const localeCookie = store.get("locale")?.value;
	if (localeCookie === "zh" || localeCookie === "en") {
		return {
			locale: localeCookie,
			messages: (await import(`../messages/${localeCookie}.json`)).default,
		};
	}

	const headersList = await headers();
	const acceptLang = headersList.get("accept-language") ?? "";
	const locale = parseAcceptLanguage(acceptLang);

	return {
		locale,
		messages: (await import(`../messages/${locale}.json`)).default,
	};
});
