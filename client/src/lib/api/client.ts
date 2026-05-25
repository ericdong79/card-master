import type { Card } from "./entities/card";
import type { CardMasteryState } from "./entities/card-mastery-state";
import type { CardPack } from "./entities/card-pack";
import type { CardSchedulingState } from "./entities/card-scheduling-state";
import type { ReviewEvent } from "./entities/review-event";
import type { SchedulingProfile } from "./entities/scheduling-profile";
import { createFirestoreApiClient } from "./firestore-client";

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

export type ApiClient = {
	list<S extends StoreName>(
		store: S,
		options?: QueryOptions<StoreValue<S>>,
	): Promise<StoreValue<S>[]>;
	get<S extends StoreName>(store: S, id: string): Promise<StoreValue<S> | null>;
	put<S extends StoreName>(store: S, record: StoreValue<S>): Promise<StoreValue<S>>;
	delete<S extends StoreName>(store: S, id: string): Promise<void>;
};

export function createApiClient(): ApiClient {
	return createFirestoreApiClient();
}
