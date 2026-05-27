import { describe, expect, it } from "vitest";

import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { ReviewSession } from "@/lib/review";

import {
	type MasteryFeedback,
	type ReviewSessionMachineState,
	initialReviewSessionState,
	isLoadedPhase,
	reviewSessionReducer,
} from "./use-review-session-state";

// --- Fixtures ---------------------------------------------------------------

const cardPack: CardPack = {
	id: "pack-1",
	account_user_id: "account-1",
	profile_id: "profile-1",
	owner_user_id: "profile-1",
	name: "Pack",
	type: "basic",
	status: "active",
	created_at: "2026-01-01T00:00:00.000Z",
	updated_at: null,
};

const cardA: Card = {
	id: "card-1",
	card_pack_id: "pack-1",
	account_user_id: "account-1",
	profile_id: "profile-1",
	owner_user_id: "profile-1",
	prompt: "Q1",
	answer: "A1",
	question_content: null,
	answer_content: null,
	status: "active",
	created_at: "2026-01-01T00:00:00.000Z",
	updated_at: null,
};

const cardB: Card = { ...cardA, id: "card-2", prompt: "Q2", answer: "A2" };

/**
 * Mutable test double for ReviewSession. Only implements the methods the
 * reducer reads (`getCurrentCard`, `isComplete`).
 */
function makeFakeSession(queue: Card[]): ReviewSession {
	let cursor = 0;
	return {
		getCurrentCard() {
			return cursor < queue.length ? queue[cursor] : null;
		},
		isComplete() {
			return cursor >= queue.length;
		},
		advance() {
			cursor += 1;
		},
	} as unknown as ReviewSession;
}

const loadedState = (
	overrides: { totalReviewed?: number; lastMasteryFeedback?: null } = {},
): ReviewSessionMachineState => {
	const session = makeFakeSession([cardA, cardB]);
	return {
		phase: "ready",
		cardPack,
		cards: [cardA, cardB],
		session,
		currentCard: session.getCurrentCard(),
		totalReviewed: overrides.totalReviewed ?? 0,
		lastMasteryFeedback: overrides.lastMasteryFeedback ?? null,
	};
};

const gradingState = (): ReviewSessionMachineState => {
	const session = makeFakeSession([cardA, cardB]);
	return {
		phase: "grading",
		cardPack,
		cards: [cardA, cardB],
		session,
		currentCard: session.getCurrentCard(),
		totalReviewed: 0,
		lastMasteryFeedback: null,
	};
};

const completeState = (): ReviewSessionMachineState => {
	const session = makeFakeSession([]);
	return {
		phase: "complete",
		cardPack,
		cards: [],
		session,
		currentCard: null,
		totalReviewed: 0,
		lastMasteryFeedback: null,
	};
};

// --- Tests ------------------------------------------------------------------

describe("reviewSessionReducer", () => {
	it("starts in idle phase", () => {
		expect(initialReviewSessionState.phase).toBe("idle");
		expect(initialReviewSessionState.totalReviewed).toBe(0);
		expect(initialReviewSessionState.lastMasteryFeedback).toBeNull();
	});

	it("transitions idle -> loading on `load`", () => {
		const next = reviewSessionReducer(initialReviewSessionState, {
			type: "load",
		});
		expect(next.phase).toBe("loading");
	});

	it("transitions loading -> ready on `loadSuccess`", () => {
		const session = makeFakeSession([cardA, cardB]);
		const next = reviewSessionReducer(
			{ ...initialReviewSessionState, phase: "loading" },
			{ type: "loadSuccess", cardPack, cards: [cardA, cardB], session },
		);
		expect(next.phase).toBe("ready");
		if (next.phase === "ready") {
			expect(next.cards).toHaveLength(2);
			expect(next.currentCard?.id).toBe("card-1");
			expect(next.cardPack.id).toBe("pack-1");
		}
	});

	it("transitions loading -> complete when session reports complete immediately", () => {
		const session = makeFakeSession([]); // no cards -> isComplete = true
		const next = reviewSessionReducer(
			{ ...initialReviewSessionState, phase: "loading" },
			{ type: "loadSuccess", cardPack, cards: [], session },
		);
		expect(next.phase).toBe("complete");
	});

	it("transitions loading -> error on `loadFailure`", () => {
		const next = reviewSessionReducer(
			{ ...initialReviewSessionState, phase: "loading" },
			{ type: "loadFailure", error: "network down" },
		);
		expect(next.phase).toBe("error");
		if (next.phase === "error") {
			expect(next.error).toBe("network down");
		}
	});

	it("ignores `loadSuccess` outside of loading phase", () => {
		const start = loadedState();
		const session = makeFakeSession([cardA]);
		const next = reviewSessionReducer(start, {
			type: "loadSuccess",
			cardPack,
			cards: [cardA],
			session,
		});
		expect(next).toBe(start);
	});

	it("ignores `loadFailure` outside of loading phase", () => {
		const start = loadedState();
		const next = reviewSessionReducer(start, {
			type: "loadFailure",
			error: "stray error",
		});
		expect(next).toBe(start);
	});

	it("transitions ready -> grading on `gradeStart`", () => {
		const start = loadedState();
		const next = reviewSessionReducer(start, { type: "gradeStart" });
		expect(next.phase).toBe("grading");
		if (next.phase === "grading") {
			expect(next.currentCard?.id).toBe("card-1");
		}
	});

	it("ignores `gradeStart` outside of ready phase", () => {
		const grading = gradingState();
		const next = reviewSessionReducer(grading, { type: "gradeStart" });
		expect(next).toBe(grading);
	});

	it("transitions grading -> ready and advances currentCard on `gradeSuccess`", () => {
		const session = makeFakeSession([cardA, cardB]);
		// Simulate session.moveToNext having run before the dispatch:
		(session as unknown as { advance: () => void }).advance();
		const start: ReviewSessionMachineState = {
			phase: "grading",
			cardPack,
			cards: [cardA, cardB],
			session,
			currentCard: cardA,
			totalReviewed: 0,
			lastMasteryFeedback: null,
		};
		const next = reviewSessionReducer(start, { type: "gradeSuccess" });
		expect(next.phase).toBe("ready");
		expect(next.totalReviewed).toBe(1);
		if (next.phase === "ready") {
			expect(next.currentCard?.id).toBe("card-2");
		}
	});

	it("transitions grading -> complete on `gradeSuccess` when last card is graded", () => {
		const session = makeFakeSession([cardA]);
		(session as unknown as { advance: () => void }).advance();
		const start: ReviewSessionMachineState = {
			phase: "grading",
			cardPack,
			cards: [cardA],
			session,
			currentCard: cardA,
			totalReviewed: 0,
			lastMasteryFeedback: null,
		};
		const next = reviewSessionReducer(start, { type: "gradeSuccess" });
		expect(next.phase).toBe("complete");
		expect(next.totalReviewed).toBe(1);
	});

	it("transitions grading -> error on synchronous `gradeFailure`", () => {
		const start = gradingState();
		const next = reviewSessionReducer(start, {
			type: "gradeFailure",
			error: "submit failed",
		});
		expect(next.phase).toBe("error");
		if (next.phase === "error") {
			expect(next.error).toBe("submit failed");
		}
	});

	it("accepts `gradeFailure` from ready phase (async persist callback)", () => {
		const start = loadedState();
		const next = reviewSessionReducer(start, {
			type: "gradeFailure",
			error: "persist failed",
		});
		expect(next.phase).toBe("error");
	});

	it("ignores `gradeSuccess` outside of grading", () => {
		const start = loadedState();
		const next = reviewSessionReducer(start, { type: "gradeSuccess" });
		expect(next).toBe(start);
	});

	it("advances current card on `skip` while staying in ready", () => {
		const session = makeFakeSession([cardA, cardB]);
		(session as unknown as { advance: () => void }).advance();
		const start: ReviewSessionMachineState = {
			phase: "ready",
			cardPack,
			cards: [cardA, cardB],
			session,
			currentCard: cardA,
			totalReviewed: 0,
			lastMasteryFeedback: null,
		};
		const next = reviewSessionReducer(start, { type: "skip" });
		expect(next.phase).toBe("ready");
		if (next.phase === "ready") {
			expect(next.currentCard?.id).toBe("card-2");
		}
		// `skip` does not bump totalReviewed:
		expect(next.totalReviewed).toBe(0);
	});

	it("ignores `skip` while grading", () => {
		const start = gradingState();
		const next = reviewSessionReducer(start, { type: "skip" });
		expect(next).toBe(start);
	});

	it("updates `lastMasteryFeedback` in any phase without changing phase", () => {
		const feedback: MasteryFeedback = {
			cardId: "card-1",
			rating: "good",
			isFirstLearn: false,
			transition: {
				beforeScore: 0,
				afterScore: 10,
				beforeState: "unseen",
				afterState: "learning",
				delta: 10,
			},
		};
		const start = loadedState();
		const next = reviewSessionReducer(start, {
			type: "setMasteryFeedback",
			feedback,
		});
		expect(next.phase).toBe("ready");
		expect(next.lastMasteryFeedback).toEqual(feedback);
	});

	it("clears state to idle on `reset`", () => {
		const start = loadedState({ totalReviewed: 5 });
		const next = reviewSessionReducer(start, { type: "reset" });
		expect(next).toEqual(initialReviewSessionState);
	});

	it("isLoadedPhase narrows ready/grading/complete only", () => {
		expect(isLoadedPhase(initialReviewSessionState)).toBe(false);
		expect(
			isLoadedPhase({
				...initialReviewSessionState,
				phase: "loading",
			}),
		).toBe(false);
		expect(
			isLoadedPhase({
				...initialReviewSessionState,
				phase: "error",
				error: "x",
			} as ReviewSessionMachineState),
		).toBe(false);
		expect(isLoadedPhase(loadedState())).toBe(true);
		expect(isLoadedPhase(gradingState())).toBe(true);
		expect(isLoadedPhase(completeState())).toBe(true);
	});
});
