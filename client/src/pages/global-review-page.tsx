import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
	getMasteryPresentationEnabled,
	getMasteryThemePreference,
} from "@/features/mastery";
import { useProfile } from "@/features/profile/profile-context";
import { MasteryToast } from "@/features/review/components/mastery-toast";
import { ReviewCard } from "@/features/review/components/review-card";
import { ReviewSummary } from "@/features/review/components/review-summary";
import { useGlobalReviewSession } from "@/features/review/hooks/use-global-review-session";

export function GlobalReviewPage() {
	const { t } = useTranslation();
	const { currentProfile } = useProfile();
	const session = useGlobalReviewSession();
	const [toastFeedback, setToastFeedback] = useState<
		typeof session.lastMasteryFeedback
	>(null);
	const masteryEnabled = currentProfile
		? getMasteryPresentationEnabled(currentProfile.id)
		: false;
	const masteryThemeId = currentProfile
		? getMasteryThemePreference(currentProfile.id)
		: null;

	useEffect(() => {
		if (!session.lastMasteryFeedback || !masteryEnabled) return;
		setToastFeedback(session.lastMasteryFeedback);
		const timer = window.setTimeout(() => {
			setToastFeedback(null);
		}, 2800);
		return () => window.clearTimeout(timer);
	}, [session.lastMasteryFeedback, masteryEnabled]);

	const current = session.currentCard;
	const currentPack = current ? session.cardPackById[current.card_pack_id] : null;

	return (
		<div className="min-h-dvh bg-muted/20">
			<header className="border-b bg-background/80 backdrop-blur">
				<div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
					<Button variant="ghost" size="sm" asChild>
						<Link to="/">{t("review.back")}</Link>
					</Button>
				</div>
			</header>

			<main className="mx-auto max-w-3xl px-6 py-8">
				{session.error ? (
					<div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{session.error}
					</div>
				) : null}

				{session.loading ? (
					<div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
						<Spinner />
						<span>{t("review.loadingQueue")}</span>
					</div>
				) : session.isComplete || !current ? (
					<ReviewSummary
						packName={t("review.globalPackName")}
						totalReviewed={session.totalReviewed}
						backToCardsPath="/"
					/>
				) : (
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
				)}
			</main>
			{masteryEnabled && toastFeedback ? (
				<MasteryToast feedback={toastFeedback} themeId={masteryThemeId} />
			) : null}
		</div>
	);
}
