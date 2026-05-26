import { describe, expect, it, vi } from "vitest";
import { logger } from "../src/logger";

describe("Logger", () => {
	it("logs debug when level is debug", () => {
		const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
		logger.setLevel("debug");
		logger.debug("msg");
		expect(spy).toHaveBeenCalledWith("[DEBUG] msg");
		spy.mockRestore();
	});

	it("suppresses debug when level is info", () => {
		const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
		logger.setLevel("info");
		logger.debug("msg");
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it("logs info when level is info", () => {
		const spy = vi.spyOn(console, "info").mockImplementation(() => {});
		logger.setLevel("info");
		logger.info("msg");
		expect(spy).toHaveBeenCalledWith("[INFO] msg");
		spy.mockRestore();
	});

	it("suppresses info when level is warn", () => {
		const spy = vi.spyOn(console, "info").mockImplementation(() => {});
		logger.setLevel("warn");
		logger.info("msg");
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it("logs warn when level is warn", () => {
		const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
		logger.setLevel("warn");
		logger.warn("msg");
		expect(spy).toHaveBeenCalledWith("[WARN] msg");
		spy.mockRestore();
	});

	it("suppresses warn when level is error", () => {
		const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
		logger.setLevel("error");
		logger.warn("msg");
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it("logs error at any level", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		logger.setLevel("error");
		logger.error("msg");
		expect(spy).toHaveBeenCalledWith("[ERROR] msg");
		spy.mockRestore();
	});

	it("passes extra arguments through", () => {
		const spy = vi.spyOn(console, "info").mockImplementation(() => {});
		logger.setLevel("info");
		logger.info("msg", "extra", 42);
		expect(spy).toHaveBeenCalledWith("[INFO] msg", "extra", 42);
		spy.mockRestore();
	});

	it("logs all levels when set to debug", () => {
		const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		logger.setLevel("debug");
		logger.debug("a");
		logger.info("b");
		logger.warn("c");
		logger.error("d");

		expect(debugSpy).toHaveBeenCalled();
		expect(infoSpy).toHaveBeenCalled();
		expect(warnSpy).toHaveBeenCalled();
		expect(errorSpy).toHaveBeenCalled();

		debugSpy.mockRestore();
		infoSpy.mockRestore();
		warnSpy.mockRestore();
		errorSpy.mockRestore();
	});
});
