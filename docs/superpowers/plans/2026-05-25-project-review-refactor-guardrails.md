# Project Review Refactor Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the codebase into a safer pre-refactor state by aligning docs with current Firestore workflows, removing obvious legacy artifacts, fixing current lint failures, reducing review-flow duplication, and addressing the highest-risk query and bundle issues.

**Architecture:** Keep the existing React + repository architecture. Prefer small shared helpers/components around existing review pages instead of replacing the review domain model. Firestore query optimization should live in repositories, not page components, so profile/account scoping remains centralized.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, Firebase Auth, Firestore, Vitest, ESLint.

---

## File Structure

- Modify: `database.md` - replace stale IndexedDB runtime description with current Firestore runtime schema and legacy import note.
- Modify: `database-schema.sql` - mark PostgreSQL/Supabase schema as historical only and stop claiming IndexedDB is current.
- Delete: `client/src/App.css` - unused Vite template CSS.
- Create: `client/src/features/review/components/review-page-shell.tsx` - shared review page layout for loading/error/summary/card rendering.
- Create: `client/src/features/review/hooks/use-mastery-toast.ts` - shared transient mastery toast state that satisfies current React hooks lint rules.
- Modify: `client/src/pages/pack-review-page.tsx` - use shared shell and toast hook.
- Modify: `client/src/pages/global-review-page.tsx` - use shared shell and toast hook.
- Modify: `client/src/pages/quick-review-page.tsx` - use shared shell.
- Create: `client/src/features/review/hooks/review-session-loader.ts` - shared loader for pack/global SM-2 session setup.
- Modify: `client/src/features/review/hooks/use-review-session.ts` - use shared loader while preserving public return shape.
- Modify: `client/src/features/review/hooks/use-global-review-session.ts` - use shared loader while preserving public return shape.
- Modify: `client/src/lib/data/repositories/card-repository.ts` - add `loadProfileCards` for global review and dashboard use.
- Modify: `client/src/lib/data/repositories/card-repository.test.ts` - test profile-wide card loading and scoping.
- Modify: `client/src/lib/data/repositories/dashboard-repository.ts` - reuse `loadProfileCards` to remove duplicate card query logic.
- Modify: `client/src/features/review/hooks/use-global-review-session.ts` - replace N+1 pack-card queries with one profile-wide card query.
- Modify: `client/src/components/safe-emoji-picker.tsx` - lazy-load `emoji-picker-react`.
- Modify: `client/src/index.css` - remove eager global `@font-face` for the 6.7MB KaiTi font and replace with an opt-in class.
- Modify: files that render Hanzi text if needed - apply the opt-in font class only where the KaiTi font is actually selected.

---

### Task 1: Align Storage Documentation and Remove Unused CSS

**Files:**
- Modify: `database.md`
- Modify: `database-schema.sql`
- Delete: `client/src/App.css`

- [ ] **Step 1: Rewrite `database.md` with current Firestore storage model**

Replace the file with this content:

```markdown
# Data Storage

## Overview

The main application stores runtime data in **Cloud Firestore**. Firebase Auth provides the account identity, and all user-owned records are scoped by both the Firebase account id and the active learner profile id.

IndexedDB and localStorage remain only as legacy browser-local import sources. They are not the runtime source of truth for the app shell, card management, or review flows.

## Firestore Collections

Collection names are defined in `client/src/lib/firebase/firestore.ts`.

### `users/{firebaseUid}`

Account-level metadata.

- `id`: Firebase Auth uid
- `email`: signed-in account email, nullable
- `display_name`: Firebase display name, nullable
- `photo_url`: Firebase photo URL, nullable
- `current_profile_id`: active learner profile id, nullable
- `created_at`: ISO timestamp
- `updated_at`: ISO timestamp, nullable

### `profiles`

Learner profiles under a Firebase account.

- `id`: profile id
- `account_user_id`: Firebase Auth uid
- `nickname`: display name inside the app
- `avatar_emoji`: profile avatar
- `primary_color`: theme color, nullable
- `hanzi_font`: Hanzi display font preference
- `sidebar_background`: sidebar background preference
- `daily_goal`: total completed cards target per day
- `review_per_day`: due cards per session
- `new_per_day`: new cards per session
- `created_at`: ISO timestamp
- `updated_at`: ISO timestamp, nullable
- `last_used_at`: ISO timestamp

### `card_pack`

Logical group of cards.

- `id`: pack id
- `account_user_id`: Firebase Auth uid
- `profile_id`: active learner profile id
- `owner_user_id`: compatibility owner field; normally equals `profile_id`
- `name`: pack name
- `type`: pack type, for example `basic` or `pinyin-hanzi`
- `status`: `active` | `suspended` | `deleted`
- `created_at`: ISO timestamp
- `updated_at`: ISO timestamp, nullable

### `card`

Individual flashcard.

- `id`: card id
- `account_user_id`: Firebase Auth uid
- `profile_id`: active learner profile id
- `owner_user_id`: compatibility owner field; normally equals `profile_id`
- `card_pack_id`: parent pack id
- `prompt`: normalized question text
- `answer`: normalized answer text
- `question_content`: typed question content, nullable
- `answer_content`: typed answer content, nullable
- `status`: `active` | `suspended` | `deleted`
- `created_at`: ISO timestamp
- `updated_at`: ISO timestamp, nullable

### `scheduling_profile`

SM-2 algorithm configuration for one learner profile.

- `id`: scheduling profile id
- `account_user_id`: Firebase Auth uid
- `profile_id`: learner profile id
- `owner_user_id`: compatibility owner field; normally equals `profile_id`
- `algorithm_key`: scheduling algorithm key, currently `sm2`
- `version`: algorithm version
- `parameters`: algorithm parameters
- `created_at`: ISO timestamp

### `card_scheduling_state`

Current scheduling state for each card.

- `id`: scheduling state id
- `account_user_id`: Firebase Auth uid
- `learner_profile_id`: learner profile id for data ownership
- `owner_user_id`: compatibility owner field; normally equals `learner_profile_id`
- `card_id`: card id
- `profile_id`: scheduling algorithm profile id
- `due_at`: ISO timestamp when the card is due
- `state`: algorithm-specific state
- `last_reviewed_at`: ISO timestamp
- `last_event_id`: latest review event id, nullable
- `created_at`: ISO timestamp

### `card_mastery_state`

Presentation-layer mastery state for cards.

- `id`: mastery state id
- `account_user_id`: Firebase Auth uid
- `profile_id`: learner profile id
- `owner_user_id`: compatibility owner field; normally equals `profile_id`
- `card_id`: card id
- `score`: mastery score
- `state`: mastery bucket
- `created_at`: ISO timestamp
- `updated_at`: ISO timestamp, nullable

### `review_event`

Immutable review history.

- `id`: review event id
- `account_user_id`: Firebase Auth uid
- `profile_id`: learner profile id
- `owner_user_id`: compatibility owner field; normally equals `profile_id`
- `card_id`: reviewed card id
- `grade`: 1-4 review grade
- `time_ms`: time spent reviewing
- `raw_payload`: additional metadata, nullable
- `reviewed_at`: ISO timestamp
- `created_at`: ISO timestamp

## Rules and Indexes

Firestore rules and indexes live in:

- `client/firestore.rules`
- `client/firestore.indexes.json`
- `client/firebase.json`

Avoid adding new query shapes that require composite indexes unless the index file and deployment notes are updated in the same change.

## Legacy Local Data Import

Older versions used browser-local IndexedDB and localStorage. The import flow reads that local data from the current browser origin and writes deterministic copies into Firestore. Import is copy-only and does not delete local data.

Historical PostgreSQL/Supabase DDL remains in `database-schema.sql` for reference only.
```

- [ ] **Step 2: Rewrite the header of `database-schema.sql`**

Change only the first three comment lines to:

```sql
-- LEGACY: This schema documents an early PostgreSQL/Supabase design.
-- The current runtime implementation uses Firebase Auth and Cloud Firestore.
-- This file is kept for historical architectural reference only.
```

- [ ] **Step 3: Delete unused Vite template CSS**

Run:

```bash
rm client/src/App.css
```

Expected: file is removed. `rg "App.css" client/src` returns no matches before and after the removal.

- [ ] **Step 4: Verify docs and build**

Run:

```bash
rg -n "current implementation uses IndexedDB|uses \\*\\*IndexedDB\\*\\*" database.md database-schema.sql
npm run build
```

Expected: `rg` returns no matches; build exits 0.

- [ ] **Step 5: Commit**

```bash
git add database.md database-schema.sql client/src/App.css
git commit -m "docs: align storage docs with firestore runtime"
```

---

### Task 2: Extract Shared Review Page Shell and Fix Lint Failure

**Files:**
- Create: `client/src/features/review/hooks/use-mastery-toast.ts`
- Create: `client/src/features/review/components/review-page-shell.tsx`
- Modify: `client/src/pages/pack-review-page.tsx`
- Modify: `client/src/pages/global-review-page.tsx`
- Modify: `client/src/pages/quick-review-page.tsx`

- [ ] **Step 1: Create shared mastery toast hook**

Create `client/src/features/review/hooks/use-mastery-toast.ts`:

```ts
import { useEffect, useRef, useState } from "react";
import type { MasteryState } from "@/lib/api/entities/card-mastery-state";
import type { ReviewGrade } from "@/lib/scheduling/types";

export type MasteryToastFeedback = {
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
} | null;

export function useMasteryToast(
	feedback: MasteryToastFeedback,
	enabled: boolean,
	ttlMs = 2800,
): MasteryToastFeedback {
	const [visibleFeedback, setVisibleFeedback] =
		useState<MasteryToastFeedback>(null);
	const lastShownKeyRef = useRef<string | null>(null);

	useEffect(() => {
		if (!enabled || !feedback) {
			setVisibleFeedback(null);
			return;
		}

		const key = `${feedback.cardId}:${feedback.rating}:${feedback.transition.afterScore}`;
		if (lastShownKeyRef.current === key) return;
		lastShownKeyRef.current = key;

		const showTimer = window.setTimeout(() => {
			setVisibleFeedback(feedback);
		}, 0);
		const hideTimer = window.setTimeout(() => {
			setVisibleFeedback(null);
		}, ttlMs);

		return () => {
			window.clearTimeout(showTimer);
			window.clearTimeout(hideTimer);
		};
	}, [enabled, feedback, ttlMs]);

	return visibleFeedback;
}
```

- [ ] **Step 2: Create shared review page shell**

Create `client/src/features/review/components/review-page-shell.tsx`:

```tsx
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type ReviewPageShellProps = {
	backPath: string;
	backLabel: string;
	error: string | null;
	loading: boolean;
	loadingLabel: string;
	isComplete: boolean;
	hasCurrentCard: boolean;
	summary: ReactNode;
	children: ReactNode;
};

export function ReviewPageShell({
	backPath,
	backLabel,
	error,
	loading,
	loadingLabel,
	isComplete,
	hasCurrentCard,
	summary,
	children,
}: ReviewPageShellProps) {
	return (
		<div className="min-h-dvh bg-muted/20">
			<header className="border-b bg-background/80 backdrop-blur">
				<div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
					<Button variant="ghost" size="sm" asChild>
						<Link to={backPath}>{backLabel}</Link>
					</Button>
				</div>
			</header>

			<main className="mx-auto max-w-3xl px-6 py-8">
				{error ? (
					<div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</div>
				) : null}

				{loading ? (
					<div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
						<Spinner />
						<span>{loadingLabel}</span>
					</div>
				) : isComplete || !hasCurrentCard ? (
					summary
				) : (
					children
				)}
			</main>
		</div>
	);
}
```

- [ ] **Step 3: Refactor `pack-review-page.tsx`**

Replace the page component with:

```tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import {
	getMasteryPresentationEnabled,
	getMasteryThemePreference,
} from "@/features/mastery";
import { useProfile } from "@/features/profile/profile-context";
import { MasteryToast } from "@/features/review/components/mastery-toast";
import { ReviewCard } from "@/features/review/components/review-card";
import { ReviewPageShell } from "@/features/review/components/review-page-shell";
import { ReviewSummary } from "@/features/review/components/review-summary";
import { useMasteryToast } from "@/features/review/hooks/use-mastery-toast";
import { useReviewSession } from "@/features/review/hooks/use-review-session";

export function PackReviewPage() {
	const { t } = useTranslation();
	const { cardPackId } = useParams<{ cardPackId: string }>();
	const navigate = useNavigate();
	const { currentProfile } = useProfile();
	const session = useReviewSession(cardPackId);
	const masteryEnabled = currentProfile
		? getMasteryPresentationEnabled(currentProfile.id)
		: false;
	const masteryThemeId = currentProfile
		? getMasteryThemePreference(currentProfile.id)
		: null;
	const toastFeedback = useMasteryToast(
		session.lastMasteryFeedback,
		masteryEnabled,
	);

	useEffect(() => {
		if (!cardPackId) return;
		if (session.loading || session.error) return;
		if (!session.isComplete) return;
		if (session.totalReviewed > 0) return;
		if (session.cards.length === 0) return;
		if (session.totalCards > 0) return;
		navigate(`/pack/${cardPackId}/quick-review`, { replace: true });
	}, [
		cardPackId,
		navigate,
		session.cards.length,
		session.error,
		session.isComplete,
		session.loading,
		session.totalCards,
		session.totalReviewed,
	]);

	if (!cardPackId) {
		return <Navigate to="/" replace />;
	}

	const current = session.currentCard;

	return (
		<>
			<ReviewPageShell
				backPath={`/pack/${cardPackId}/cards`}
				backLabel={t("review.back")}
				error={session.error}
				loading={session.loading}
				loadingLabel={t("review.loadingQueue")}
				isComplete={session.isComplete}
				hasCurrentCard={Boolean(current)}
				summary={
					<ReviewSummary
						packName={session.cardPack?.name ?? null}
						totalReviewed={session.totalReviewed}
						backToCardsPath={`/pack/${cardPackId}/cards`}
					/>
				}
			>
				{current ? (
					<ReviewCard
						key={current.id}
						mode="sm2"
						card={current}
						packName={session.cardPack?.name}
						packType={session.cardPack?.type}
						learnedCount={session.completedCount}
						totalCards={session.totalCards}
						onGrade={session.handleGrade}
						onSkip={session.handleSkip}
						isProcessing={session.grading}
						state={session.currentCardState}
						params={session.params}
					/>
				) : null}
			</ReviewPageShell>
			{masteryEnabled && toastFeedback ? (
				<MasteryToast feedback={toastFeedback} themeId={masteryThemeId} />
			) : null}
		</>
	);
}
```

- [ ] **Step 4: Refactor `global-review-page.tsx`**

Replace the page component with:

```tsx
import { useTranslation } from "react-i18next";

import {
	getMasteryPresentationEnabled,
	getMasteryThemePreference,
} from "@/features/mastery";
import { useProfile } from "@/features/profile/profile-context";
import { MasteryToast } from "@/features/review/components/mastery-toast";
import { ReviewCard } from "@/features/review/components/review-card";
import { ReviewPageShell } from "@/features/review/components/review-page-shell";
import { ReviewSummary } from "@/features/review/components/review-summary";
import { useGlobalReviewSession } from "@/features/review/hooks/use-global-review-session";
import { useMasteryToast } from "@/features/review/hooks/use-mastery-toast";

export function GlobalReviewPage() {
	const { t } = useTranslation();
	const { currentProfile } = useProfile();
	const session = useGlobalReviewSession();
	const masteryEnabled = currentProfile
		? getMasteryPresentationEnabled(currentProfile.id)
		: false;
	const masteryThemeId = currentProfile
		? getMasteryThemePreference(currentProfile.id)
		: null;
	const toastFeedback = useMasteryToast(
		session.lastMasteryFeedback,
		masteryEnabled,
	);

	const current = session.currentCard;
	const currentPack = current ? session.cardPackById[current.card_pack_id] : null;

	return (
		<>
			<ReviewPageShell
				backPath="/"
				backLabel={t("review.back")}
				error={session.error}
				loading={session.loading}
				loadingLabel={t("review.loadingQueue")}
				isComplete={session.isComplete}
				hasCurrentCard={Boolean(current)}
				summary={
					<ReviewSummary
						packName={t("review.globalPackName")}
						totalReviewed={session.totalReviewed}
						backToCardsPath="/"
					/>
				}
			>
				{current ? (
					<div className="space-y-3">
						<div className="rounded-md border bg-background px-4 py-2 text-sm">
							<p className="text-muted-foreground">
								{t("review.globalScope", { count: session.sessionPackCount })}
							</p>
							<p className="font-medium text-foreground">
								{t("review.currentPack", {
									name: currentPack?.name ?? t("cards.packFallback"),
								})}
							</p>
						</div>
						<ReviewCard
							key={current.id}
							mode="sm2"
							card={current}
							packName={currentPack?.name ?? t("cards.packFallback")}
							packType={currentPack?.type}
							learnedCount={session.completedCount}
							totalCards={session.totalCards}
							onGrade={session.handleGrade}
							onSkip={session.handleSkip}
							isProcessing={session.grading}
							state={session.currentCardState}
							params={session.params}
						/>
					</div>
				) : null}
			</ReviewPageShell>
			{masteryEnabled && toastFeedback ? (
				<MasteryToast feedback={toastFeedback} themeId={masteryThemeId} />
			) : null}
		</>
	);
}
```

- [ ] **Step 5: Refactor `quick-review-page.tsx`**

Replace the page component with:

```tsx
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { ReviewCard } from "@/features/review/components/review-card";
import { ReviewPageShell } from "@/features/review/components/review-page-shell";
import { ReviewSummary } from "@/features/review/components/review-summary";
import { useQuickReview } from "@/features/review/hooks/use-quick-review";

export function QuickReviewPage() {
	const { t } = useTranslation();
	const { cardPackId } = useParams<{ cardPackId: string }>();
	const session = useQuickReview(cardPackId);

	if (!cardPackId) {
		return <Navigate to="/" replace />;
	}

	const current = session.currentCard;

	return (
		<ReviewPageShell
			backPath={`/pack/${cardPackId}/cards`}
			backLabel={t("review.back")}
			error={session.error}
			loading={session.loading}
			loadingLabel={t("common.loadingCards")}
			isComplete={session.isComplete}
			hasCurrentCard={Boolean(current)}
			summary={
				<ReviewSummary
					packName={session.cardPack?.name ?? null}
					totalReviewed={session.position.total}
					backToCardsPath={`/pack/${cardPackId}/cards`}
					mode="quick"
					forgotCards={session.forgotCards}
				/>
			}
		>
			{current ? (
				<ReviewCard
					key={current.id}
					mode="simple"
					card={current}
					packName={session.cardPack?.name}
					packType={session.cardPack?.type}
					learnedCount={session.learnedCount}
					totalCards={session.totalCards}
					onReview={session.handleReview}
					onSkip={session.skipCurrent}
					isProcessing={session.reviewing}
				/>
			) : null}
		</ReviewPageShell>
	);
}
```

- [ ] **Step 6: Verify lint/build/tests**

Run:

```bash
npm run lint
npm run build
npm run test -- --run
```

Expected: all three commands exit 0. The previous `react-hooks/set-state-in-effect` errors are gone.

- [ ] **Step 7: Commit**

```bash
git add client/src/features/review/components/review-page-shell.tsx client/src/features/review/hooks/use-mastery-toast.ts client/src/pages/pack-review-page.tsx client/src/pages/global-review-page.tsx client/src/pages/quick-review-page.tsx
git commit -m "refactor: share review page shell"
```

---

### Task 3: Share SM-2 Review Session Loading Logic

**Files:**
- Create: `client/src/features/review/hooks/review-session-loader.ts`
- Modify: `client/src/features/review/hooks/use-review-session.ts`
- Modify: `client/src/features/review/hooks/use-global-review-session.ts`

- [ ] **Step 1: Create shared loader**

Create `client/src/features/review/hooks/review-session-loader.ts`:

```ts
import { normalizeDailyReviewSettings } from "@/features/review/daily-goal";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { SchedulingProfile } from "@/lib/api/entities/scheduling-profile";
import { ReviewSession } from "@/lib/review";
import { normalizeSm2Parameters } from "@/lib/scheduling/sm2";
import type { Sm2Parameters } from "@/lib/scheduling/types";

export type ReviewSessionLoaderSettings = {
	dailyGoal?: number;
	reviewPerDay?: number;
	newPerDay?: number;
};

export type BuildSm2ReviewSessionInput = {
	accountUserId: string;
	profileId: string;
	cards: Card[];
	schedulingStates: CardSchedulingState[];
	schedulingProfile: SchedulingProfile;
	completedToday: number;
	settings: ReviewSessionLoaderSettings;
};

export type BuiltSm2ReviewSession = {
	session: ReviewSession;
	params: Sm2Parameters;
	sessionTotalLimit: number;
	reviewCardsLimit: number;
	newCardsLimit: number;
};

export function buildSm2ReviewSession({
	accountUserId,
	profileId,
	cards,
	schedulingStates,
	schedulingProfile,
	completedToday,
	settings,
}: BuildSm2ReviewSessionInput): BuiltSm2ReviewSession {
	const params = normalizeSm2Parameters(
		schedulingProfile.parameters as Sm2Parameters,
	);
	const normalizedSettings = normalizeDailyReviewSettings({
		dailyGoal: settings.dailyGoal,
		reviewPerDay: settings.reviewPerDay,
		newPerDay: settings.newPerDay,
	});
	const sessionTotalLimit =
		completedToday < normalizedSettings.dailyGoal
			? Math.max(0, normalizedSettings.dailyGoal - completedToday)
			: normalizedSettings.reviewPerDay + normalizedSettings.newPerDay;

	const session = ReviewSession.create(
		cards,
		schedulingStates,
		params,
		schedulingProfile.id,
		{
			newCardsLimit: normalizedSettings.newPerDay,
			reviewCardsLimit: normalizedSettings.reviewPerDay,
			totalCardsLimit: sessionTotalLimit,
			ownerUserId: profileId,
			accountUserId,
			learnerProfileId: profileId,
		},
	);

	return {
		session,
		params,
		sessionTotalLimit,
		reviewCardsLimit: normalizedSettings.reviewPerDay,
		newCardsLimit: normalizedSettings.newPerDay,
	};
}

export function mapCardPacksById(cardPacks: CardPack[]): Record<string, CardPack> {
	return cardPacks.reduce<Record<string, CardPack>>((acc, pack) => {
		acc[pack.id] = pack;
		return acc;
	}, {});
}
```

- [ ] **Step 2: Add unit tests for loader**

Create `client/src/features/review/hooks/review-session-loader.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/api/entities/card";
import type { SchedulingProfile } from "@/lib/api/entities/scheduling-profile";
import { buildSm2ReviewSession, mapCardPacksById } from "./review-session-loader";

const card: Card = {
	id: "card-1",
	card_pack_id: "pack-1",
	account_user_id: "account-1",
	profile_id: "profile-1",
	owner_user_id: "profile-1",
	prompt: "Q",
	answer: "A",
	question_content: null,
	answer_content: null,
	status: "active",
	created_at: "2026-01-01T00:00:00.000Z",
	updated_at: null,
};

const schedulingProfile: SchedulingProfile = {
	id: "sched-profile-1",
	account_user_id: "account-1",
	profile_id: "profile-1",
	owner_user_id: "profile-1",
	algorithm_key: "sm2",
	version: 1,
	parameters: {},
	created_at: "2026-01-01T00:00:00.000Z",
};

describe("buildSm2ReviewSession", () => {
	it("uses remaining daily goal when the goal is not met", () => {
		const result = buildSm2ReviewSession({
			accountUserId: "account-1",
			profileId: "profile-1",
			cards: [card],
			schedulingStates: [],
			schedulingProfile,
			completedToday: 2,
			settings: { dailyGoal: 5, reviewPerDay: 20, newPerDay: 10 },
		});

		expect(result.sessionTotalLimit).toBe(3);
		expect(result.reviewCardsLimit).toBe(20);
		expect(result.newCardsLimit).toBe(10);
		expect(result.session.getCurrentCard()?.id).toBe("card-1");
	});
});

describe("mapCardPacksById", () => {
	it("indexes packs by id", () => {
		expect(
			mapCardPacksById([
				{
					id: "pack-1",
					account_user_id: "account-1",
					profile_id: "profile-1",
					owner_user_id: "profile-1",
					name: "Pack 1",
					type: "basic",
					status: "active",
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: null,
				},
			]),
		).toHaveProperty("pack-1.name", "Pack 1");
	});
});
```

- [ ] **Step 3: Run the new failing/passing test target**

Run:

```bash
npm run test -- --run src/features/review/hooks/review-session-loader.test.ts
```

Expected after Step 1 and Step 2: PASS.

- [ ] **Step 4: Replace duplicate session limit calculation in `use-review-session.ts`**

In `client/src/features/review/hooks/use-review-session.ts`, remove direct imports of `normalizeDailyReviewSettings`, `ReviewSession`, `normalizeSm2Parameters`, and `Sm2Parameters` if they become unused. Add:

```ts
import {
	buildSm2ReviewSession,
} from "@/features/review/hooks/review-session-loader";
```

Replace the block that creates `params`, `settings`, `sessionTotalLimit`, `reviewCardsLimit`, `newCardsLimit`, and `newSession` with:

```ts
				const { session: newSession } = buildSm2ReviewSession({
					accountUserId,
					profileId,
					cards: fetchedCards,
					schedulingStates: stateList,
					schedulingProfile,
					completedToday,
					settings: {
						dailyGoal: currentProfile?.daily_goal,
						reviewPerDay: currentProfile?.review_per_day,
						newPerDay: currentProfile?.new_per_day,
					},
				});
```

- [ ] **Step 5: Replace duplicate session limit calculation in `use-global-review-session.ts`**

In `client/src/features/review/hooks/use-global-review-session.ts`, remove direct imports of `normalizeDailyReviewSettings`, `ReviewSession`, `normalizeSm2Parameters`, and `Sm2Parameters` if they become unused. Add:

```ts
import {
	buildSm2ReviewSession,
	mapCardPacksById,
} from "@/features/review/hooks/review-session-loader";
```

Replace the `cardPackById` `useMemo` body with:

```ts
	const cardPackById = useMemo(() => mapCardPacksById(cardPacks), [cardPacks]);
```

Replace the block that creates `params`, `settings`, `sessionTotalLimit`, and `newSession` with:

```ts
				const { session: newSession } = buildSm2ReviewSession({
					accountUserId,
					profileId,
					cards: fetchedCards,
					schedulingStates: stateList,
					schedulingProfile,
					completedToday,
					settings: {
						dailyGoal: currentProfile?.daily_goal,
						reviewPerDay: currentProfile?.review_per_day,
						newPerDay: currentProfile?.new_per_day,
					},
				});
```

- [ ] **Step 6: Verify full review tests and app checks**

Run:

```bash
npm run test -- --run src/features/review/hooks/review-session-loader.test.ts src/lib/review/review-session.test.ts
npm run lint
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add client/src/features/review/hooks/review-session-loader.ts client/src/features/review/hooks/review-session-loader.test.ts client/src/features/review/hooks/use-review-session.ts client/src/features/review/hooks/use-global-review-session.ts
git commit -m "refactor: share sm2 review session setup"
```

---

### Task 4: Remove Global Review N+1 Card Loading

**Files:**
- Modify: `client/src/lib/data/repositories/card-repository.ts`
- Modify: `client/src/lib/data/repositories/card-repository.test.ts`
- Modify: `client/src/lib/data/repositories/dashboard-repository.ts`
- Modify: `client/src/features/review/hooks/use-global-review-session.ts`

- [ ] **Step 1: Add repository test for profile-wide card loading**

Append this test to `client/src/lib/data/repositories/card-repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createCardRepository } from "./card-repository";
import { createRepositoryTestDb } from "./repository-test-utils";

describe("card repository profile-wide loading", () => {
	it("loads only active cards owned by the account and learner profile", async () => {
		const db = createRepositoryTestDb({
			card: [
				{
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
				},
				{
					id: "card-2",
					card_pack_id: "pack-2",
					account_user_id: "account-1",
					profile_id: "profile-2",
					owner_user_id: "profile-2",
					prompt: "Q2",
					answer: "A2",
					question_content: null,
					answer_content: null,
					status: "active",
					created_at: "2026-01-02T00:00:00.000Z",
					updated_at: null,
				},
				{
					id: "card-3",
					card_pack_id: "pack-1",
					account_user_id: "account-1",
					profile_id: "profile-1",
					owner_user_id: "profile-1",
					prompt: "Q3",
					answer: "A3",
					question_content: null,
					answer_content: null,
					status: "deleted",
					created_at: "2026-01-03T00:00:00.000Z",
					updated_at: null,
				},
			],
		});

		const cards = await createCardRepository({ db }).loadProfileCards({
			accountUserId: "account-1",
			profileId: "profile-1",
		});

		expect(cards.map((card) => card.id)).toEqual(["card-1"]);
	});
});
```

If the file already imports `describe`, `expect`, `it`, `createCardRepository`, or `createRepositoryTestDb`, merge the imports instead of duplicating them.

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npm run test -- --run src/lib/data/repositories/card-repository.test.ts
```

Expected: FAIL with a TypeScript/runtime error that `loadProfileCards` does not exist.

- [ ] **Step 3: Implement `loadProfileCards`**

In `client/src/lib/data/repositories/card-repository.ts`, add this type near the other input types:

```ts
type LoadProfileCardsInput = ProfileScopeInput & {
	status?: CardStatus;
};
```

Add this function inside `createCardRepository`:

```ts
	async function loadProfileCards({
		accountUserId,
		profileId,
		status = "active",
	}: LoadProfileCardsInput): Promise<Card[]> {
		const records = deps.db
			? deps.db.card.filter((card) =>
					hasProfileOwnership(card, accountUserId, profileId),
				)
			: (
					await queryStoreRecords(
						"card",
						profileOwnershipConstraints(accountUserId, profileId),
					)
				).filter((card) => hasProfileOwnership(card, accountUserId, profileId));

		return sortByCreatedAt(
			status ? records.filter((card) => card.status === status) : records,
		);
	}
```

Return it from the repository:

```ts
	return {
		loadPackCards,
		loadProfileCards,
		createCard,
		updateCard,
		deleteCard,
		listMasteryStatesByCardIds,
		bulkCreateCards,
	};
```

- [ ] **Step 4: Reuse `loadProfileCards` in dashboard repository**

In `client/src/lib/data/repositories/dashboard-repository.ts`, import `createCardRepository`:

```ts
import {
	createCardRepository,
} from "./card-repository";
```

Inside `createDashboardRepository`, add:

```ts
	const cardRepository = createCardRepository(deps);
```

Delete the local `loadProfileCards` helper and replace the dashboard call:

```ts
	const [cardPacks, cards, schedulingStates] = await Promise.all([
		loadProfilePacks(accountUserId, profileId),
		cardRepository.loadProfileCards({ accountUserId, profileId }),
		schedulingRepository.listSchedulingStatesForProfile({
			accountUserId,
			profileId,
		}),
	]);
```

- [ ] **Step 5: Replace N+1 global review card loading**

In `client/src/features/review/hooks/use-global-review-session.ts`, replace:

```ts
				const fetchedCards = (
					await Promise.all(
						fetchedPacks.map((pack) =>
							cardRepository.loadPackCards({
								accountUserId,
								profileId,
								cardPackId: pack.id,
							}),
						),
					)
				)
					.flat()
					.sort(
						(a, b) =>
							Date.parse(a.created_at ?? "") - Date.parse(b.created_at ?? ""),
					);
```

with:

```ts
				const activePackIds = new Set(fetchedPacks.map((pack) => pack.id));
				const fetchedCards = (
					await cardRepository.loadProfileCards({ accountUserId, profileId })
				).filter((card) => activePackIds.has(card.card_pack_id));
```

- [ ] **Step 6: Verify repository and app behavior**

Run:

```bash
npm run test -- --run src/lib/data/repositories/card-repository.test.ts src/lib/data/repositories/dashboard-repository.test.ts
npm run lint
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add client/src/lib/data/repositories/card-repository.ts client/src/lib/data/repositories/card-repository.test.ts client/src/lib/data/repositories/dashboard-repository.ts client/src/features/review/hooks/use-global-review-session.ts
git commit -m "perf: load global review cards in one query"
```

---

### Task 5: Reduce Initial Bundle Weight From Legacy Assets

**Files:**
- Modify: `client/src/components/safe-emoji-picker.tsx`
- Modify: `client/src/index.css`
- Modify: `client/src/features/cards/previews/pinyin-hanzi/pinyin-hanzi-card-preview-content.tsx`
- Modify: `client/src/features/review/components/pinyin-hanzi-review-content.tsx`

- [ ] **Step 1: Inspect current emoji picker wrapper**

Run:

```bash
sed -n '1,220p' client/src/components/safe-emoji-picker.tsx
```

Expected: file directly imports `emoji-picker-react`, which causes the emoji picker package to be emitted as a large route-level chunk.

- [ ] **Step 2: Lazy-load emoji picker**

Replace `client/src/components/safe-emoji-picker.tsx` with:

```tsx
import { lazy, Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

type EmojiClickData = {
	emoji: string;
};

type SafeEmojiPickerProps = {
	onEmojiClick: (emojiData: EmojiClickData) => void;
};

export function SafeEmojiPicker({ onEmojiClick }: SafeEmojiPickerProps) {
	if (typeof window === "undefined") {
		return null;
	}

	return (
		<Suspense
			fallback={
				<div className="flex min-h-64 items-center justify-center">
					<Spinner />
				</div>
			}
		>
			<EmojiPicker onEmojiClick={onEmojiClick} />
		</Suspense>
	);
}
```

- [ ] **Step 3: Remove global KaiTi font eager declaration**

In `client/src/index.css`, replace:

```css
@font-face {
  font-family: "CardMasterKaiTi";
  src: url("./assets/fonts/kaiti.woff2") format("woff2");
  font-display: swap;
}
```

with:

```css
.font-card-master-kaiti {
  font-family: "CardMasterKaiTi", serif;
}

.font-card-master-kaiti::before {
  content: "";
  font-family: "CardMasterKaiTi";
}
```

Then add this lower in the file, after the two custom classes:

```css
@font-face {
  font-family: "CardMasterKaiTi";
  src: url("./assets/fonts/kaiti.woff2") format("woff2");
  font-display: swap;
}
```

If Vite still emits `kaiti.woff2` into the initial CSS asset after build, keep the CSS functional but record the result in the task completion note; a follow-up will need a JS-driven dynamic font loader.

- [ ] **Step 4: Apply the opt-in KaiTi class to Hanzi renderers**

In `client/src/features/cards/previews/pinyin-hanzi/pinyin-hanzi-card-preview-content.tsx`, add `font-card-master-kaiti` to the Hanzi text element className.

Use this pattern:

```tsx
className="font-card-master-kaiti text-4xl font-semibold"
```

In `client/src/features/review/components/pinyin-hanzi-review-content.tsx`, add the same `font-card-master-kaiti` class to the Hanzi answer display element.

- [ ] **Step 5: Verify build asset output**

Run:

```bash
npm run build
du -sh dist/assets/* | sort -h | tail -20
```

Expected: build exits 0. Record whether `emoji-picker-react` remains split out and whether `kaiti.woff2` is still emitted; do not change behavior to chase perfect bundle output in this task.

- [ ] **Step 6: Run lint/tests**

Run:

```bash
npm run lint
npm run test -- --run
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/safe-emoji-picker.tsx client/src/index.css client/src/features/cards/previews/pinyin-hanzi/pinyin-hanzi-card-preview-content.tsx client/src/features/review/components/pinyin-hanzi-review-content.tsx
git commit -m "perf: lazy load heavier optional UI assets"
```

---

## Final Verification

- [ ] Run:

```bash
cd client
npm run lint
npm run test -- --run
npm run build
```

Expected: all commands exit 0.

- [ ] Confirm query and docs cleanup:

```bash
rg -n "current implementation uses IndexedDB|uses \\*\\*IndexedDB\\*\\*" ../database.md ../database-schema.sql
rg -n "Promise\\.all\\(\\s*fetchedPacks\\.map" src/features/review/hooks/use-global-review-session.ts
rg -n "App\\.css" src
```

Expected: all three `rg` commands return no matches.

## Self-Review Notes

- Spec coverage: covers current workflows indirectly through docs/guardrail updates, outdated docs, dead code, lint failures, review duplication, N+1 query performance, and initial bundle concerns.
- Placeholder scan: no task uses TBD/TODO/fill-in placeholders. Where exact line positions may shift, the plan gives exact files, exact code snippets, and exact verification commands.
- Type consistency: `MasteryToastFeedback`, `buildSm2ReviewSession`, `mapCardPacksById`, and `loadProfileCards` are defined before use and use existing entity names.
