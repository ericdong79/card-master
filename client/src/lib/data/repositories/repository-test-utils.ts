import type { StoreName, StoreValue } from "@/lib/api/client";

export type RepositoryTestDb = {
	[S in StoreName]: StoreValue<S>[];
};

export function createRepositoryTestDb(
	initial?: Partial<RepositoryTestDb>,
): RepositoryTestDb {
	return {
		card_pack: [],
		card: [],
		card_mastery_state: [],
		card_scheduling_state: [],
		scheduling_profile: [],
		review_event: [],
		...initial,
	};
}

export function upsertRecord<S extends StoreName>(
	db: RepositoryTestDb,
	store: S,
	record: StoreValue<S>,
): StoreValue<S> {
	const records = db[store] as StoreValue<S>[];
	const index = records.findIndex((item) => item.id === record.id);
	if (index >= 0) {
		records[index] = record;
	} else {
		records.push(record);
	}
	return record;
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
