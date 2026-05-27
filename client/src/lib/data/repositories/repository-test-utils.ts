import type { StoreName, StoreValue } from "@/lib/data/store-client";

export type RepositoryTestDb = {
	[S in StoreName]: StoreValue<S>[];
};

export function createRepositoryTestDb(
	initial?: Partial<RepositoryTestDb>,
): RepositoryTestDb {
	return {
		card_pack: [...(initial?.card_pack ?? [])],
		card: [...(initial?.card ?? [])],
		card_mastery_state: [...(initial?.card_mastery_state ?? [])],
		card_scheduling_state: [...(initial?.card_scheduling_state ?? [])],
		scheduling_profile: [...(initial?.scheduling_profile ?? [])],
		review_event: [...(initial?.review_event ?? [])],
	};
}

export function upsertRecord<S extends StoreName>(
	db: RepositoryTestDb,
	store: S,
	record: StoreValue<S>,
): void {
	const records = db[store] as StoreValue<S>[];
	const index = records.findIndex((item) => item.id === record.id);
	if (index >= 0) {
		records[index] = record;
	} else {
		records.push(record);
	}
}

export function deleteRecord<S extends StoreName>(
	db: RepositoryTestDb,
	store: S,
	id: string,
): void {
	const records = db[store] as StoreValue<S>[];
	const index = records.findIndex((record) => record.id === id);
	if (index >= 0) {
		records.splice(index, 1);
	}
}
