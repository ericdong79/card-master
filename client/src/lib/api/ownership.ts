export type CloudOwnership = {
	account_user_id: string;
	profile_id: string;
	owner_user_id: string;
};

export function createCloudOwnership(
	accountUserId: string,
	profileId: string,
): CloudOwnership {
	return {
		account_user_id: accountUserId,
		profile_id: profileId,
		owner_user_id: profileId,
	};
}

export function hasCloudOwnership(
	record: Partial<CloudOwnership>,
	accountUserId: string,
	profileId: string,
): boolean {
	return (
		record.account_user_id === accountUserId &&
		record.profile_id === profileId &&
		record.owner_user_id === profileId
	);
}
