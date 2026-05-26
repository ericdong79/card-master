import { z } from "zod";

/**
 * Strict Zod schemas for the card-master export/import payload.
 *
 * Why strict? Imports are an attacker-facing boundary — a tampered or
 * accidentally hand-edited JSON file should be rejected loudly, not silently
 * coerced. Forward compatibility for new fields is NOT a requirement here:
 * users will produce new payloads from the current export code.
 *
 * Each sub-schema is `.strict()` so unknown fields fail validation.
 */

const CARD_MEDIA_KIND = ["image", "audio"] as const;
const CARD_STATUS = ["active", "suspended", "deleted"] as const;
const CARD_PACK_STATUS = ["active", "suspended", "deleted"] as const;
const CARD_PACK_TYPE = ["basic", "image-recall", "pinyin-hanzi"] as const;
const MASTERY_STATE = [
	"unseen",
	"learning",
	"graduated",
	"reviewing",
	"mastered",
] as const;

const CardMediaAssetSchema = z
	.object({
		kind: z.enum(CARD_MEDIA_KIND),
		mime_type: z.string(),
		data_url: z.string(),
	})
	.strict();

const CardSideContentSchema = z
	.object({
		text: z.string().optional(),
		image: CardMediaAssetSchema.optional(),
		audio: CardMediaAssetSchema.optional(),
	})
	.strict();

export const CardPackSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		type: z.enum(CARD_PACK_TYPE).optional(),
		owner_user_id: z.string(),
		account_user_id: z.string().optional(),
		profile_id: z.string().optional(),
		status: z.enum(CARD_PACK_STATUS),
		created_at: z.string(),
		updated_at: z.string().nullable(),
	})
	.strict();

export const CardSchema = z
	.object({
		id: z.string(),
		card_pack_id: z.string(),
		owner_user_id: z.string(),
		account_user_id: z.string().optional(),
		profile_id: z.string().optional(),
		prompt: z.string(),
		answer: z.string(),
		question_content: CardSideContentSchema.nullable().optional(),
		answer_content: CardSideContentSchema.nullable().optional(),
		status: z.enum(CARD_STATUS),
		created_at: z.string(),
		updated_at: z.string().nullable(),
	})
	.strict();

export const SchedulingProfileSchema = z
	.object({
		id: z.string(),
		owner_user_id: z.string(),
		account_user_id: z.string().optional(),
		profile_id: z.string().optional(),
		algorithm_key: z.string(),
		parameters: z.record(z.string(), z.unknown()),
		version: z.number(),
		created_at: z.string(),
	})
	.strict();

export const CardSchedulingStateImportSchema = z
	.object({
		id: z.string(),
		owner_user_id: z.string(),
		account_user_id: z.string().optional(),
		learner_profile_id: z.string().optional(),
		card_id: z.string(),
		profile_id: z.string(),
		due_at: z.string(),
		state: z.record(z.string(), z.unknown()),
		last_reviewed_at: z.string(),
		last_event_id: z.string().nullable(),
		created_at: z.string(),
	})
	.strict();

export const ReviewEventImportSchema = z
	.object({
		id: z.string(),
		card_id: z.string(),
		owner_user_id: z.string(),
		account_user_id: z.string().optional(),
		profile_id: z.string().optional(),
		grade: z.number(),
		time_ms: z.number(),
		raw_payload: z.record(z.string(), z.unknown()).nullable(),
		reviewed_at: z.string(),
		created_at: z.string(),
	})
	.strict();

export const CardMasteryStateImportSchema = z
	.object({
		id: z.string(),
		owner_user_id: z.string(),
		account_user_id: z.string().optional(),
		profile_id: z.string().optional(),
		card_id: z.string(),
		mastery_score: z.number(),
		mastery_state: z.enum(MASTERY_STATE),
		easy_streak: z.number(),
		recent_outcomes: z.array(z.boolean()),
		created_at: z.string(),
		updated_at: z.string(),
	})
	.strict();

export const ExportReviewStateSchema = z
	.object({
		scheduling_profiles: z.array(SchedulingProfileSchema),
		scheduling_states: z.array(CardSchedulingStateImportSchema),
		review_events: z.array(ReviewEventImportSchema),
		card_mastery_states: z.array(CardMasteryStateImportSchema).optional(),
	})
	.strict();

export const ImportPayloadSchema = z
	.object({
		format: z.literal("card-master-export"),
		version: z.literal(1),
		exported_at: z.string(),
		include_review_state: z.boolean(),
		packs: z.array(CardPackSchema),
		cards: z.array(CardSchema),
		review_state: ExportReviewStateSchema.optional(),
	})
	.strict();

type ZodIssue = z.core.$ZodIssue;

function formatIssue(issue: ZodIssue): string {
	const path = issue.path.length === 0 ? "(root)" : issue.path.join(".");
	return `${path}: ${issue.message}`;
}

export class ImportPayloadValidationError extends Error {
	readonly issues: ZodIssue[];

	constructor(issues: ZodIssue[]) {
		const summary = issues.map(formatIssue).join("; ");
		super(`Import file is malformed: ${summary}`);
		this.name = "ImportPayloadValidationError";
		this.issues = issues;
	}
}

/**
 * Parses an import payload, accumulating all validation issues across
 * top-level fields, every card, every pack, every scheduling profile, and
 * every review-state item — so the user sees the full failure report on a
 * single attempt instead of fixing one error at a time.
 */
export function parseImportPayload(
	input: unknown,
): z.infer<typeof ImportPayloadSchema> {
	// First pass: top-level shape and `.strict()` checks on the envelope.
	const envelopeResult = ImportPayloadSchema.safeParse(input);
	if (envelopeResult.success) {
		return envelopeResult.data;
	}

	// If the envelope itself is wrong (missing format/version, not an object,
	// not iterable, etc.), there's no point trying to enumerate items — bail
	// with the envelope errors.
	const envelopeIssues = envelopeResult.error.issues;
	const envelopeFatal = envelopeIssues.some((issue) => {
		const top = issue.path[0];
		return (
			top === "format" ||
			top === "version" ||
			top === "include_review_state" ||
			top === "exported_at" ||
			issue.path.length === 0
		);
	});
	if (envelopeFatal) {
		throw new ImportPayloadValidationError(envelopeIssues);
	}

	// Otherwise re-validate each array element to collect per-item issues
	// from packs/cards/review_state. This gives users a full list of every
	// malformed row in one go.
	const issues: ZodIssue[] = [];
	const payload = input as Record<string, unknown>;

	const collect = (
		schema: z.ZodTypeAny,
		items: unknown,
		basePath: string,
	) => {
		if (!Array.isArray(items)) {
			issues.push({
				code: "custom",
				path: [basePath],
				message: "expected array",
				input: items,
			} as ZodIssue);
			return;
		}
		items.forEach((item, index) => {
			const result = schema.safeParse(item);
			if (!result.success) {
				for (const issue of result.error.issues) {
					issues.push({
						...issue,
						path: [basePath, index, ...issue.path],
					});
				}
			}
		});
	};

	collect(CardPackSchema, payload.packs, "packs");
	collect(CardSchema, payload.cards, "cards");

	const reviewState = payload.review_state;
	if (reviewState && typeof reviewState === "object") {
		const rs = reviewState as Record<string, unknown>;
		collect(
			SchedulingProfileSchema,
			rs.scheduling_profiles,
			"review_state.scheduling_profiles",
		);
		collect(
			CardSchedulingStateImportSchema,
			rs.scheduling_states,
			"review_state.scheduling_states",
		);
		collect(
			ReviewEventImportSchema,
			rs.review_events,
			"review_state.review_events",
		);
		if (rs.card_mastery_states != null) {
			collect(
				CardMasteryStateImportSchema,
				rs.card_mastery_states,
				"review_state.card_mastery_states",
			);
		}
	}

	if (issues.length === 0) {
		// Should not happen — envelope rejected but no per-item issue. Fall back
		// to the envelope errors for completeness.
		throw new ImportPayloadValidationError(envelopeIssues);
	}

	throw new ImportPayloadValidationError(issues);
}
