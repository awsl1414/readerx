type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
	private level: LogLevel = "info";

	setLevel(level: LogLevel): void {
		this.level = level;
	}

	debug(msg: string, ...args: unknown[]): void {
		if (this.shouldLog("debug")) console.debug(`[DEBUG] ${msg}`, ...args);
	}

	info(msg: string, ...args: unknown[]): void {
		if (this.shouldLog("info")) console.info(`[INFO] ${msg}`, ...args);
	}

	warn(msg: string, ...args: unknown[]): void {
		if (this.shouldLog("warn")) console.warn(`[WARN] ${msg}`, ...args);
	}

	error(msg: string, ...args: unknown[]): void {
		if (this.shouldLog("error")) console.error(`[ERROR] ${msg}`, ...args);
	}

	private shouldLog(level: LogLevel): boolean {
		const order: LogLevel[] = ["debug", "info", "warn", "error"];
		return order.indexOf(level) >= order.indexOf(this.level);
	}
}

export const logger = new Logger();
