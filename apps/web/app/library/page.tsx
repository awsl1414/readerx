import { getTranslations } from "next-intl/server";

export default async function LibraryPage() {
	const t = await getTranslations("library");
	return <h1 className="text-2xl font-semibold">{t("title")}</h1>;
}
