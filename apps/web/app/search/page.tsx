import { getTranslations } from "next-intl/server";

export default async function SearchPage() {
	const t = await getTranslations("search");
	return <h1 className="text-2xl font-semibold">{t("title")}</h1>;
}
