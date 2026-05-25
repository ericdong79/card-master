import { where, type QueryConstraint } from "firebase/firestore";

export type FirestoreProfileScope = {
	accountUserId: string;
	profileId: string;
};

export function profileScope(
	accountUserId: string,
	profileId: string,
): FirestoreProfileScope {
	return { accountUserId, profileId };
}

export function profileOwnershipConstraints(
	accountUserId: string,
	profileId: string,
): QueryConstraint[] {
	return [
		where("account_user_id", "==", accountUserId),
		where("profile_id", "==", profileId),
	];
}

export function learnerOwnershipConstraints(
	accountUserId: string,
	profileId: string,
): QueryConstraint[] {
	return [
		where("account_user_id", "==", accountUserId),
		where("learner_profile_id", "==", profileId),
	];
}

export function hasProfileOwnership(
	record: Partial<{
		account_user_id: string;
		profile_id: string;
		owner_user_id: string;
	}>,
	profileId: string,
): boolean {
	return record.profile_id === profileId && record.owner_user_id === profileId;
}

export function hasLearnerOwnership(
	record: Partial<{
		account_user_id: string;
		learner_profile_id: string;
		owner_user_id: string;
	}>,
	profileId: string,
): boolean {
	return (
		record.learner_profile_id === profileId && record.owner_user_id === profileId
	);
}
