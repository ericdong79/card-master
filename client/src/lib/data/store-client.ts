import type { Card } from "@/lib/api/entities/card";
import type { CardMasteryState } from "@/lib/api/entities/card-mastery-state";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { ReviewEvent } from "@/lib/api/entities/review-event";
import type { SchedulingProfile } from "@/lib/api/entities/scheduling-profile";
import { createFirestoreApiClient } from "./firestore/firestore-client";

export type StoreValueMap = {
	card_pack: CardPack;
	card: Card;
	card_mastery_state: CardMasteryState;
	card_scheduling_state: CardSchedulingState;
	scheduling_profile: SchedulingProfile;
	review_event: ReviewEvent;
};

export type StoreName = keyof StoreValueMap;

export type StoreValue<S extends StoreName> = StoreValueMap[S];

export type QueryOptions<T> = {
	filter?: (record: T) => boolean;
	sortBy?: (a: T, b: T) => number;
	cacheKey?: string;
	cacheTtlMs?: number;
};

/**
 * @deprecated Use feature repositories under `@/lib/data/repositories/*` instead.
 * The generic client remains only for legacy compatibility and import paths.
 */
export type ApiClient = {
	list<S extends StoreName>(
		store: S,
		options?: QueryOptions<StoreValue<S>>,
	): Promise<StoreValue<S>[]>;
	get<S extends StoreName>(store: S, id: string): Promise<StoreValue<S> | null>;
	put<S extends StoreName>(store: S, record: StoreValue<S>): Promise<StoreValue<S>>;
	delete<S extends StoreName>(store: S, id: string): Promise<void>;
};

/**
 * @deprecated Use feature repositories under `@/lib/data/repositories/*` instead.
 * The generic client remains only for legacy compatibility and import paths.
 */
export function createApiClient(): ApiClient {
	return createFirestoreApiClient();
}
