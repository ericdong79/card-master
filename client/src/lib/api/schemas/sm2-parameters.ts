import { z } from "zod";

import { SM2_DEFAULT_PARAMETERS } from "@/lib/scheduling/sm2/const";
import { normalizeSm2Parameters } from "@/lib/scheduling/sm2/sm2";
import type { Sm2Parameters } from "@/lib/scheduling/types";

/**
 * Zod schema for the SM-2 algorithm parameters persisted in
 * `scheduling_profile.parameters`. The shape mirrors `Sm2Parameters`
 * (`client/src/lib/scheduling/types/sm2-types.ts`).
 *
 * NOTE: this schema is Firestore-read facing — we intentionally do NOT use
 * `.strict()`, so future fields are tolerated (forward compatibility).
 */
export const Sm2ParametersSchema = z.object({
	learningSteps: z.array(z.string()),
	easyInterval: z.string(),
	startingEase: z.number().finite(),
	easyBonus: z.number().finite(),
	intervalMultiplier: z.number().finite(),
	maxInterval: z.string(),
	forgotInterval: z.string(),
	relearningSteps: z.array(z.string()),
	lapseIntervalMultiplier: z.number().finite(),
	minimumEase: z.number().finite().optional(),
});

/**
 * Partial schema — used for the per-field validation pass. Each field is
 * individually validated only if present; missing fields are filled from
 * `SM2_DEFAULT_PARAMETERS` by `normalizeSm2Parameters`.
 */
const Sm2ParametersPartialSchema = Sm2ParametersSchema.partial();

/**
 * Parses raw `Record<string, unknown>` (as returned by Firestore) into a
 * well-typed `Sm2Parameters`.
 *
 * Behaviour:
 * - Missing fields → silently filled from `SM2_DEFAULT_PARAMETERS` (legacy
 *   behaviour: a `parameters: {}` document is a valid, idiomatic empty
 *   profile).
 * - Present-but-wrong-type fields → logged via `console.warn` with the issue
 *   list, then the bad field is dropped and the default takes over.
 * - Non-object input → logged and pure defaults returned.
 *
 * Never throws — SM-2 should never crash a review session due to dirty
 * parameter data.
 */
export function parseSm2Parameters(input: unknown): Sm2Parameters {
	if (input == null) {
		return { ...SM2_DEFAULT_PARAMETERS };
	}
	if (typeof input !== "object") {
		console.warn(
			"[sm2-parameters] parameters is not an object, falling back to defaults",
			{ input },
		);
		return { ...SM2_DEFAULT_PARAMETERS };
	}

	const result = Sm2ParametersPartialSchema.safeParse(input);
	if (result.success) {
		return normalizeSm2Parameters(result.data);
	}

	// One or more present fields had the wrong type. Log, then strip the
	// invalid keys and feed the cleaned object through the normalizer.
	console.warn(
		"[sm2-parameters] malformed parameter fields, falling back to defaults for those keys",
		result.error.issues,
	);

	const cleaned: Record<string, unknown> = { ...(input as Record<string, unknown>) };
	for (const issue of result.error.issues) {
		const key = issue.path[0];
		if (typeof key === "string") delete cleaned[key];
	}
	return normalizeSm2Parameters(cleaned as Partial<Sm2Parameters>);
}
