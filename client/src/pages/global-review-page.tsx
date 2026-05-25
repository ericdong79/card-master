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
