import { normalizeDailyReviewSettings } from "@/features/review/daily-goal";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { SchedulingProfile } from "@/lib/api/entities/scheduling-profile";
import { parseSm2Parameters } from "@/lib/api/schemas/sm2-parameters";
import { ReviewSession } from "@/lib/review";
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
	const params = parseSm2Parameters(schedulingProfile.parameters);
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
