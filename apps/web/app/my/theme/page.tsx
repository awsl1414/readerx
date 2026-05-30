import { getTranslations } from "next-intl/server";

import { ThemeSettings } from "./theme-settings";

export default async function ThemePage() {
	const t = await getTranslations("my");
	return (
		<div className="mx-auto max-w-lg space-y-6">
			<h1 className="text-2xl font-semibold">{t("theme")}</h1>
			<ThemeSettings />
		</div>
	);
}
