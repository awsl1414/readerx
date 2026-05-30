export function expandTemplate(
	template: string,
	variables: Readonly<Record<string, string | undefined>>,
): string {
	let result = template;
	for (const [key, value] of Object.entries(variables)) {
		if (value !== undefined) {
			result = result.replaceAll(`{{${key}}}`, value);
		}
	}
	return result;
}
