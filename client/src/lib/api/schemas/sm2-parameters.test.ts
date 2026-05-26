import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SM2_DEFAULT_PARAMETERS } from "@/lib/scheduling/sm2/const";
import type { Sm2Parameters } from "@/lib/scheduling/types";

import { parseSm2Parameters } from "./sm2-parameters";

describe("parseSm2Parameters", () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it("returns a fully-shaped Sm2Parameters for a valid input", () => {
		const input: Sm2Parameters = {
			learningSteps: ["1d", "3d"],
			easyInterval: "4d",
			startingEase: 2.5,
			easyBonus: 1.3,
			intervalMultiplier: 1,
			maxInterval: "365d",
			forgotInterval: "1m",
			relearningSteps: ["1d"],
			lapseIntervalMultiplier: 0.5,
			minimumEase: 1.3,
		};
		const parsed = parseSm2Parameters(input);

		expect(parsed).toMatchObject(input);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("fills missing fields from defaults without warning (empty object)", () => {
		const parsed = parseSm2Parameters({});

		expect(parsed).toMatchObject(SM2_DEFAULT_PARAMETERS);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("strips wrong-typed fields and logs a warning", () => {
		const parsed = parseSm2Parameters({
			startingEase: "not a number",
			easyBonus: 1.5,
		});

		// The bad field falls back to default; the good override is preserved.
		expect(parsed.startingEase).toBe(SM2_DEFAULT_PARAMETERS.startingEase);
		expect(parsed.easyBonus).toBe(1.5);
		expect(warnSpy).toHaveBeenCalledTimes(1);
		const firstArg = warnSpy.mock.calls[0]?.[0];
		expect(firstArg).toMatch(/sm2-parameters/);
	});

	it("returns pure defaults and warns when input is not an object", () => {
		const parsed = parseSm2Parameters("garbage" as unknown);

		expect(parsed).toEqual(SM2_DEFAULT_PARAMETERS);
		expect(warnSpy).toHaveBeenCalledTimes(1);
	});

	it("returns pure defaults silently when input is null/undefined", () => {
		expect(parseSm2Parameters(null)).toEqual(SM2_DEFAULT_PARAMETERS);
		expect(parseSm2Parameters(undefined)).toEqual(SM2_DEFAULT_PARAMETERS);
		expect(warnSpy).not.toHaveBeenCalled();
	});
});
