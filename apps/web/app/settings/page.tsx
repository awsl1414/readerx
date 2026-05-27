import { getTranslations } from "next-intl/server";

export default async function SettingsPage() {
	const t = await getTranslations("settings");
	return <h1 className="text-2xl font-semibold">{t("title")}</h1>;
}
