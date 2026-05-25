/**
 * 应用配置
 */

export function getEnv(key: string, defaultValue?: string): string | undefined {
	// eslint-disable-next-line no-restricted-globals
	if (typeof process !== "undefined" && typeof process.env === "object") {
		return process.env[key] ?? defaultValue;
	}
	return defaultValue;
}
