import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	query,
	setDoc,
	writeBatch,
	where,
	type DocumentData,
} from "firebase/firestore";

import type { UserProfile } from "@/features/profile/profile-context";
import { clearFirestoreReadCache } from "@/lib/api/firestore-client";
import {
	FIRESTORE_COLLECTIONS,
	getCardMasterFirestore,
} from "@/lib/firebase/firestore";

export type AccountRecord = {
	id: string;
	email: string | null;
	display_name: string | null;
	photo_url: string | null;
	current_profile_id: string | null;
	created_at: string;
	updated_at: string;
};

export type CloudUserProfile = UserProfile & {
	account_user_id: string;
};

type AccountRecordInput = {
	id: string;
	email: string | null;
	displayName: string | null;
	photoUrl: string | null;
	now: string;
};

function sanitizeFirestoreValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) =>
			item === undefined ? null : sanitizeFirestoreValue(item),
		);
	}

	if (!value || Object.prototype.toString.call(value) !== "[object Object]") {
		return value;
	}

	const sanitized: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(value)) {
		if (item !== undefined) {
			sanitized[key] = sanitizeFirestoreValue(item);
		}
	}
	return sanitized;
}

function sanitizeFirestoreDocument(record: DocumentData): DocumentData {
	return sanitizeFirestoreValue(record) as DocumentData;
}

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
		...(data as UserProfile),
		id: typeof data.id === "string" && data.id.length > 0 ? data.id : id,
		account_user_id:
			typeof data.account_user_id === "string"
				? data.account_user_id
				: accountUserId,
	} as CloudUserProfile;
}

export async function getOrCreateAccountRecord(
	input: AccountRecordInput,
): Promise<AccountRecord> {
	const db = getCardMasterFirestore();
	const documentRef = doc(db, FIRESTORE_COLLECTIONS.users, input.id);
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

export async function updateAccountCurrentProfile(
	accountUserId: string,
	profileId: string | null,
	now: string,
): Promise<void> {
	const db = getCardMasterFirestore();
	const documentRef = doc(db, FIRESTORE_COLLECTIONS.users, accountUserId);
	await setDoc(
		documentRef,
		{
			current_profile_id: profileId,
			updated_at: now,
		},
		{ merge: true },
	);
}

async function deleteProfileOwnedCollection(
	collectionName: string,
	fieldName: string,
	accountUserId: string,
	profileId: string,
): Promise<void> {
	const db = getCardMasterFirestore();
	const collectionRef = collection(db, collectionName);
	const snapshot = await getDocs(
		query(
			collectionRef,
			where("account_user_id", "==", accountUserId),
		),
	);

	for (const documentSnapshot of snapshot.docs) {
		const data = documentSnapshot.data();
		if (data[fieldName] !== profileId && data.owner_user_id !== profileId) {
			continue;
		}
		await deleteDoc(documentSnapshot.ref);
	}
}

export async function deleteCloudProfileWithData(
	accountUserId: string,
	profileId: string,
	nextCurrentProfileId: string | null,
	now: string,
): Promise<void> {
	const db = getCardMasterFirestore();

	await Promise.all([
		deleteProfileOwnedCollection(
			FIRESTORE_COLLECTIONS.cardPacks,
			"profile_id",
			accountUserId,
			profileId,
		),
		deleteProfileOwnedCollection(
			FIRESTORE_COLLECTIONS.cards,
			"profile_id",
			accountUserId,
			profileId,
		),
		deleteProfileOwnedCollection(
			FIRESTORE_COLLECTIONS.schedulingProfiles,
			"profile_id",
			accountUserId,
			profileId,
		),
		deleteProfileOwnedCollection(
			FIRESTORE_COLLECTIONS.cardMasteryStates,
			"profile_id",
			accountUserId,
			profileId,
		),
		deleteProfileOwnedCollection(
			FIRESTORE_COLLECTIONS.reviewEvents,
			"profile_id",
			accountUserId,
			profileId,
		),
		deleteProfileOwnedCollection(
			FIRESTORE_COLLECTIONS.cardSchedulingStates,
			"learner_profile_id",
			accountUserId,
			profileId,
		),
	]);

	await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.profiles, profileId));
	await updateAccountCurrentProfile(accountUserId, nextCurrentProfileId, now);
	clearFirestoreReadCache();
}

export async function listCloudProfiles(
	accountUserId: string,
): Promise<CloudUserProfile[]> {
	const db = getCardMasterFirestore();
	const collectionRef = collection(db, FIRESTORE_COLLECTIONS.profiles);
	const snapshot = await getDocs(
		query(
			collectionRef,
			where("account_user_id", "==", accountUserId),
		),
	);

	return snapshot.docs
		.map((documentSnapshot) =>
			normalizeCloudProfile(
				documentSnapshot.data(),
				documentSnapshot.id,
				accountUserId,
			),
		)
		.sort(
			(a, b) =>
				Date.parse(b.last_used_at ?? "") - Date.parse(a.last_used_at ?? ""),
		);
}

export async function saveCloudProfile(
	profile: CloudUserProfile,
): Promise<void> {
	const db = getCardMasterFirestore();
	const documentRef = doc(db, FIRESTORE_COLLECTIONS.profiles, profile.id);
	await setDoc(documentRef, sanitizeFirestoreDocument(profile));
}

export async function saveCloudProfileAndSetCurrentProfile(
	profile: CloudUserProfile,
	now: string,
): Promise<void> {
	const db = getCardMasterFirestore();
	const batch = writeBatch(db);
	const profileRef = doc(db, FIRESTORE_COLLECTIONS.profiles, profile.id);
	const accountRef = doc(
		db,
		FIRESTORE_COLLECTIONS.users,
		profile.account_user_id,
	);

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

export async function touchCloudProfileAndSetCurrentProfile(
	accountUserId: string,
	profileId: string,
	now: string,
): Promise<void> {
	const db = getCardMasterFirestore();
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
