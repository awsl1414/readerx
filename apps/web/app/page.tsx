import { getTranslations } from "next-intl/server";

export default async function HomePage() {
	const t = await getTranslations("home");
	return (
		<div className="space-y-8">
			<section>
				<h1 className="text-2xl font-semibold">{t("continueReading")}</h1>
				<p className="mt-3 text-muted-foreground">{t("noBooks")}</p>
			</section>
		</div>
	);
}
