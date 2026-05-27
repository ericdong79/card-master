import type { Card } from "@/lib/api/entities/card";
import type { MasteryState } from "@/lib/api/entities/card-mastery-state";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { ReviewSession } from "@/lib/review";
import type { ReviewGrade } from "@/lib/scheduling/types";

/**
 * Mastery transition feedback emitted asynchronously after a grade is
 * persisted. It is orthogonal to the session phase: it can arrive at any time
 * after the user grades a card, so we keep it as a cross-phase field.
 */
export type MasteryFeedback = {
	cardId: string;
	transition: {
		beforeScore: number;
		afterScore: number;
		beforeState: MasteryState;
		afterState: MasteryState;
		delta: number;
	};
	rating: ReviewGrade;
	isFirstLearn: boolean;
};

/**
 * Data that exists once a session has been successfully loaded. Shared by the
 * `ready`, `grading`, and `complete` phases so consumers can keep showing the
 * pack / queue while the user is grading or after the session ends.
 */
export type LoadedSessionData = {
	cardPack: CardPack;
	cards: Card[];
	session: ReviewSession;
	currentCard: Card | null;
};

/**
 * Discriminated union describing every legal review-session phase.
 *
 * Invariants enforced by the type system:
 * - Only one phase is active at a time. `loading` and `error` cannot coexist.
 * - Loaded session data (cardPack, cards, session, currentCard) only exists
 *   in `ready`/`grading`/`complete`.
 * - `error` only carries the error message; it has no card data.
 */
export type ReviewSessionPhase =
	| { phase: "idle" }
	| { phase: "loading" }
	| { phase: "error"; error: string }
	| ({ phase: "ready" } & LoadedSessionData)
	| ({ phase: "grading" } & LoadedSessionData)
	| ({ phase: "complete" } & LoadedSessionData);

export type ReviewSessionMachineState = ReviewSessionPhase & {
	totalReviewed: number;
	lastMasteryFeedback: MasteryFeedback | null;
};

export type ReviewSessionAction =
	| { type: "load" }
	| {
			type: "loadSuccess";
			cardPack: CardPack;
			cards: Card[];
			session: ReviewSession;
	  }
	| { type: "loadFailure"; error: string }
	| { type: "gradeStart" }
	| { type: "gradeSuccess" }
	| { type: "gradeFailure"; error: string }
	| { type: "skip" }
	| { type: "setMasteryFeedback"; feedback: MasteryFeedback | null }
	| { type: "reset" };

export const initialReviewSessionState: ReviewSessionMachineState = {
	phase: "idle",
	totalReviewed: 0,
	lastMasteryFeedback: null,
};

const initialLoadingState: ReviewSessionMachineState = {
	phase: "loading",
	totalReviewed: 0,
	lastMasteryFeedback: null,
};

/**
 * Refresh the loaded snapshot from the live ReviewSession (currentCard +
 * whether the session is complete). The session class is mutable, so we
 * read it once per transition to keep the React state in sync.
 */
function syncFromSession(
	data: LoadedSessionData,
): ({ phase: "ready" } | { phase: "complete" }) & LoadedSessionData {
	const nextCard = data.session.getCurrentCard();
	const synced: LoadedSessionData = { ...data, currentCard: nextCard };
	if (data.session.isComplete()) {
		return { phase: "complete", ...synced };
	}
	return { phase: "ready", ...synced };
}

/**
 * Pure reducer for the review-session state machine. Invalid action/phase
 * combinations return the current state unchanged so a stray dispatch (e.g.
 * a late grade callback after navigation) never corrupts the UI.
 */
export function reviewSessionReducer(
	state: ReviewSessionMachineState,
	action: ReviewSessionAction,
): ReviewSessionMachineState {
	switch (action.type) {
		case "load": {
			return initialLoadingState;
		}
		case "loadSuccess": {
			if (state.phase !== "loading") return state;
			const data: LoadedSessionData = {
				cardPack: action.cardPack,
				cards: action.cards,
				session: action.session,
				currentCard: action.session.getCurrentCard(),
			};
			const synced = syncFromSession(data);
			return {
				...synced,
				totalReviewed: 0,
				lastMasteryFeedback: null,
			};
		}
		case "loadFailure": {
			if (state.phase !== "loading") return state;
			return {
				phase: "error",
				error: action.error,
				totalReviewed: 0,
				lastMasteryFeedback: null,
			};
		}
		case "gradeStart": {
			if (state.phase !== "ready") return state;
			return {
				phase: "grading",
				cardPack: state.cardPack,
				cards: state.cards,
				session: state.session,
				currentCard: state.currentCard,
				totalReviewed: state.totalReviewed,
				lastMasteryFeedback: state.lastMasteryFeedback,
			};
		}
		case "gradeSuccess": {
			if (state.phase !== "grading") return state;
			const synced = syncFromSession({
				cardPack: state.cardPack,
				cards: state.cards,
				session: state.session,
				currentCard: state.currentCard,
			});
			return {
				...synced,
				totalReviewed: state.totalReviewed + 1,
				lastMasteryFeedback: state.lastMasteryFeedback,
			};
		}
		case "gradeFailure": {
			// Two valid origins: synchronous grade error (phase=grading) or
			// async persistReviewResult callback (phase already advanced). We
			// surface the message in both cases without leaving the session.
			if (
				state.phase !== "grading" &&
				state.phase !== "ready" &&
				state.phase !== "complete"
			) {
				return state;
			}
			return {
				phase: "error",
				error: action.error,
				totalReviewed: state.totalReviewed,
				lastMasteryFeedback: state.lastMasteryFeedback,
			};
		}
		case "skip": {
			if (state.phase !== "ready") return state;
			const synced = syncFromSession({
				cardPack: state.cardPack,
				cards: state.cards,
				session: state.session,
				currentCard: state.currentCard,
			});
			return {
				...synced,
				totalReviewed: state.totalReviewed,
				lastMasteryFeedback: state.lastMasteryFeedback,
			};
		}
		case "setMasteryFeedback": {
			return {
				...state,
				lastMasteryFeedback: action.feedback,
			};
		}
		case "reset": {
			return initialReviewSessionState;
		}
		default: {
			// Exhaustiveness check: if a new action variant is added without a
			// case above, this assignment fails to type-check.
			action satisfies never;
			return state;
		}
	}
}

/**
 * Helper: did we ever successfully load a session? Used by the hook surface to
 * project the union back onto the legacy boolean-style API consumers depend on.
 */
export function isLoadedPhase(
	state: ReviewSessionMachineState,
): state is ReviewSessionMachineState & LoadedSessionData {
	return (
		state.phase === "ready" ||
		state.phase === "grading" ||
		state.phase === "complete"
	);
}
