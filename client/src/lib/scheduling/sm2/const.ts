import type { Sm2Parameters } from "@/lib/scheduling/types";

export const HARD_INTERVAL_FACTOR = 1.2;
export const AGAIN_EASE_PENALTY = 0.2;
export const HARD_EASE_PENALTY = 0.15;
export const EASY_EASE_BONUS = 0.15;

export const SM2_DEFAULT_PARAMETERS: Sm2Parameters = {
	learningSteps: ["1d", "2d"],
	easyInterval: "4d", // Easy graduation
	startingEase: 2.3,
	easyBonus: 1.3,
	intervalMultiplier: 1, //Review Phase overall multiplier
	maxInterval: "1825d",
	forgotInterval: "1m",
	relearningSteps: ["1d", "4d"],
	lapseIntervalMultiplier: 0.1,
	minimumEase: 1.3,
};
