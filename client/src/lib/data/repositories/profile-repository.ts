import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	query,
	setDoc,
	where,
	writeBatch,
	type DocumentData,
} from "firebase/firestore";

import type { StoreName } from "@/lib/api/client";
import { clearFirestoreReadCache } from "@/lib/api/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/lib/firebase/firestore";
import {
	commitBatchedWrites,
	type BatchOperation,
} from "@/lib/data/firestore/batch-writer";
import {
	getFirestoreDb,
	queryStoreRecords,
	sanitizeFirestoreDocument,
	storeDocRef,
} from "@/lib/data/firestore/firestore-store";
import {
	hasLearnerOwnership,
	hasProfileOwnership,
	learnerOwnershipConstraints,
	profileOwnershipConstraints,
} from "@/lib/data/firestore/ownership";
import { clearQueryCache } from "@/lib/data/firestore/query-cache";

import {
	deleteRecord,
	type RepositoryTestDb,
} from "./repository-test-utils";

export type AccountRecord = {
	id: string;
	email: string | null;
	display_name: string | null;
	photo_url: string | null;
	current_profile_id: string | null;
	created_at: string;
	updated_at: string;
};

export type CloudUserProfile = {
	id: string;
	nickname: string;
	avatar_emoji: string;
	primary_color: string | null;
	hanzi_font: "default" | "kaiti" | "pixel";
	sidebar_background: "none" | "nav-illustration";
	daily_goal: number;
	review_per_day: number;
	new_per_day: number;
	created_at: string;
	updated_at: string | null;
	last_used_at: string;
	account_user_id: string;
};

type AccountRecordInput = {
	id: string;
	email: string | null;
	displayName: string | null;
	photoUrl: string | null;
	now: string;
};

export type ProfileRepositoryDeps = {
	db?: RepositoryTestDb;
	accounts?: AccountRecord[];
	profiles?: CloudUserProfile[];
};

const PROFILE_OWNED_STORES = [
	"card_pack",
	"card",
	"scheduling_profile",
	"card_mastery_state",
	"review_event",
] as const satisfies StoreName[];

const LEARNER_OWNED_STORES = [
	"card_scheduling_state",
] as const satisfies StoreName[];

function normalizeAccountRecord(
	data: DocumentData,
	id: string,
	input: AccountRecordInput,
): AccountRecord {
	return {
		id,
		email:
			typeof data.email === "string" || data.email === null
				? data.email
				: input.email,
		display_name:
			typeof data.display_name === "string" || data.display_name === null
				? data.display_name
				: input.displayName,
		photo_url:
			typeof data.photo_url === "string" || data.photo_url === null
				? data.photo_url
				: input.photoUrl,
		current_profile_id:
			typeof data.current_profile_id === "string" ||
			data.current_profile_id === null
				? data.current_profile_id
				: null,
		created_at:
			typeof data.created_at === "string" ? data.created_at : input.now,
		updated_at:
			typeof data.updated_at === "string" ? data.updated_at : input.now,
	};
}

function normalizeCloudProfile(
	data: DocumentData,
	id: string,
	accountUserId: string,
): CloudUserProfile {
	return {
		...(data as CloudUserProfile),
		id: typeof data.id === "string" && data.id.length > 0 ? data.id : id,
		account_user_id:
			typeof data.account_user_id === "string"
				? data.account_user_id
				: accountUserId,
	} as CloudUserProfile;
}

function upsertAccount(accounts: AccountRecord[], account: AccountRecord): void {
	const index = accounts.findIndex((record) => record.id === account.id);
	if (index >= 0) {
		accounts[index] = account;
	} else {
		accounts.push(account);
	}
}

function upsertProfile(
	profiles: CloudUserProfile[],
	profile: CloudUserProfile,
): void {
	const index = profiles.findIndex((record) => record.id === profile.id);
	if (index >= 0) {
		profiles[index] = profile;
	} else {
		profiles.push(profile);
	}
}

function sortProfilesByLastUsed(
	profiles: CloudUserProfile[],
): CloudUserProfile[] {
	return [...profiles].sort(
		(a, b) =>
			Date.parse(b.last_used_at ?? "") - Date.parse(a.last_used_at ?? ""),
	);
}

function clearAffectedCaches(accountUserId: string, profileId: string): void {
	clearQueryCache({ accountUserId, profileId });
	for (const store of [...PROFILE_OWNED_STORES, ...LEARNER_OWNED_STORES]) {
		clearFirestoreReadCache(store);
	}
}

async function productionDeleteOperations(
	accountUserId: string,
	profileId: string,
): Promise<BatchOperation[]> {
	const operations: BatchOperation[] = [];

	for (const store of PROFILE_OWNED_STORES) {
		const records = await queryStoreRecords(
			store,
			profileOwnershipConstraints(accountUserId, profileId),
		);
		for (const record of records) {
			if (hasProfileOwnership(record, accountUserId, profileId)) {
				operations.push({
					type: "delete",
					ref: storeDocRef(store, record.id),
				});
			}
		}
	}

	for (const store of LEARNER_OWNED_STORES) {
		const records = await queryStoreRecords(
			store,
			learnerOwnershipConstraints(accountUserId, profileId),
		);
		for (const record of records) {
			if (hasLearnerOwnership(record, accountUserId, profileId)) {
				operations.push({
					type: "delete",
					ref: storeDocRef(store, record.id),
				});
			}
		}
	}

	return operations;
}

export function createProfileRepository(deps: ProfileRepositoryDeps = {}) {
	const accounts = deps.accounts ?? [];
	const profiles = deps.profiles ?? [];

	async function getOrCreateAccountRecord(
		input: AccountRecordInput,
	): Promise<AccountRecord> {
		if (deps.db) {
			const existing = accounts.find((account) => account.id === input.id);
			if (existing) return existing;

			const account: AccountRecord = {
				id: input.id,
				email: input.email,
				display_name: input.displayName,
				photo_url: input.photoUrl,
				current_profile_id: null,
				created_at: input.now,
				updated_at: input.now,
			};
			accounts.push(account);
			return account;
		}

		const documentRef = doc(getFirestoreDb(), FIRESTORE_COLLECTIONS.users, input.id);
		const snapshot = await getDoc(documentRef);

		if (snapshot.exists()) {
			return normalizeAccountRecord(snapshot.data(), snapshot.id, input);
		}

		const account: AccountRecord = {
			id: input.id,
			email: input.email,
			display_name: input.displayName,
			photo_url: input.photoUrl,
			current_profile_id: null,
			created_at: input.now,
			updated_at: input.now,
		};
		await setDoc(documentRef, sanitizeFirestoreDocument(account));
		return account;
	}

	async function updateAccountCurrentProfile(
		accountUserId: string,
		profileId: string | null,
		now: string,
	): Promise<void> {
		if (deps.db) {
			const existing = accounts.find((account) => account.id === accountUserId);
			const account: AccountRecord = {
				id: accountUserId,
				email: existing?.email ?? null,
				display_name: existing?.display_name ?? null,
				photo_url: existing?.photo_url ?? null,
				current_profile_id: profileId,
				created_at: existing?.created_at ?? now,
				updated_at: now,
			};
			upsertAccount(accounts, account);
			return;
		}

		const documentRef = doc(
			getFirestoreDb(),
			FIRESTORE_COLLECTIONS.users,
			accountUserId,
		);
		await setDoc(
			documentRef,
			{
				current_profile_id: profileId,
				updated_at: now,
			},
			{ merge: true },
		);
	}

	async function listCloudProfiles(
		accountUserId: string,
	): Promise<CloudUserProfile[]> {
		if (deps.db) {
			return sortProfilesByLastUsed(
				profiles.filter((profile) => profile.account_user_id === accountUserId),
			);
		}

		const collectionRef = collection(
			getFirestoreDb(),
			FIRESTORE_COLLECTIONS.profiles,
		);
		const snapshot = await getDocs(
			query(collectionRef, where("account_user_id", "==", accountUserId)),
		);

		return sortProfilesByLastUsed(
			snapshot.docs.map((documentSnapshot) =>
				normalizeCloudProfile(
					documentSnapshot.data(),
					documentSnapshot.id,
					accountUserId,
				),
			),
		);
	}

	async function saveCloudProfile(profile: CloudUserProfile): Promise<void> {
		if (deps.db) {
			upsertProfile(profiles, profile);
			return;
		}

		const documentRef = doc(
			getFirestoreDb(),
			FIRESTORE_COLLECTIONS.profiles,
			profile.id,
		);
		await setDoc(documentRef, sanitizeFirestoreDocument(profile));
	}

	async function saveCloudProfileAndSetCurrentProfile(
		profile: CloudUserProfile,
		now: string,
	): Promise<void> {
		if (deps.db) {
			upsertProfile(profiles, profile);
			await updateAccountCurrentProfile(profile.account_user_id, profile.id, now);
			return;
		}

		const db = getFirestoreDb();
		const batch = writeBatch(db);
		const profileRef = doc(db, FIRESTORE_COLLECTIONS.profiles, profile.id);
		const accountRef = doc(db, FIRESTORE_COLLECTIONS.users, profile.account_user_id);

		batch.set(profileRef, sanitizeFirestoreDocument(profile));
		batch.set(
			accountRef,
			{
				current_profile_id: profile.id,
				updated_at: now,
			},
			{ merge: true },
		);

		await batch.commit();
	}

	async function touchCloudProfileAndSetCurrentProfile(
		accountUserId: string,
		profileId: string,
		now: string,
	): Promise<void> {
		if (deps.db) {
			const existing = profiles.find((profile) => profile.id === profileId);
			if (existing) {
				upsertProfile(profiles, { ...existing, last_used_at: now });
			}
			await updateAccountCurrentProfile(accountUserId, profileId, now);
			return;
		}

		const db = getFirestoreDb();
		const batch = writeBatch(db);
		const profileRef = doc(db, FIRESTORE_COLLECTIONS.profiles, profileId);
		const accountRef = doc(db, FIRESTORE_COLLECTIONS.users, accountUserId);

		batch.set(
			profileRef,
			{
				last_used_at: now,
			},
			{ merge: true },
		);
		batch.set(
			accountRef,
			{
				current_profile_id: profileId,
				updated_at: now,
			},
			{ merge: true },
		);

		await batch.commit();
	}

	async function deleteProfileWithData(
		accountUserId: string,
		profileId: string,
		nextCurrentProfileId: string | null,
		now: string,
	): Promise<void> {
		if (deps.db) {
			for (const store of PROFILE_OWNED_STORES) {
				for (const record of [...deps.db[store]]) {
					if (hasProfileOwnership(record, accountUserId, profileId)) {
						deleteRecord(deps.db, store, record.id);
					}
				}
			}
			for (const store of LEARNER_OWNED_STORES) {
				for (const record of [...deps.db[store]]) {
					if (hasLearnerOwnership(record, accountUserId, profileId)) {
						deleteRecord(deps.db, store, record.id);
					}
				}
			}

			const profileIndex = profiles.findIndex(
				(profile) =>
					profile.id === profileId && profile.account_user_id === accountUserId,
			);
			if (profileIndex >= 0) {
				profiles.splice(profileIndex, 1);
			}
			await updateAccountCurrentProfile(accountUserId, nextCurrentProfileId, now);
			return;
		}

		await commitBatchedWrites(
			await productionDeleteOperations(accountUserId, profileId),
		);
		await deleteDoc(
			doc(getFirestoreDb(), FIRESTORE_COLLECTIONS.profiles, profileId),
		);
		await updateAccountCurrentProfile(accountUserId, nextCurrentProfileId, now);
		clearAffectedCaches(accountUserId, profileId);
	}

	function getTestProfiles(): CloudUserProfile[] {
		return profiles;
	}

	function getTestAccount(accountUserId: string): AccountRecord | null {
		return accounts.find((account) => account.id === accountUserId) ?? null;
	}

	return {
		getOrCreateAccountRecord,
		updateAccountCurrentProfile,
		listCloudProfiles,
		saveCloudProfile,
		saveCloudProfileAndSetCurrentProfile,
		touchCloudProfileAndSetCurrentProfile,
		deleteProfileWithData,
		getTestProfiles,
		getTestAccount,
	};
}
