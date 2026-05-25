import { createProfileRepository } from "@/lib/data/repositories/profile-repository";

export type {
	AccountRecord,
	CloudUserProfile,
} from "@/lib/data/repositories/profile-repository";

const repository = createProfileRepository();

export const getOrCreateAccountRecord = repository.getOrCreateAccountRecord;
export const updateAccountCurrentProfile = repository.updateAccountCurrentProfile;
export const listCloudProfiles = repository.listCloudProfiles;
export const saveCloudProfile = repository.saveCloudProfile;
export const saveManyCloudProfiles = repository.saveManyCloudProfiles;
export const saveCloudProfileAndSetCurrentProfile =
	repository.saveCloudProfileAndSetCurrentProfile;
export const touchCloudProfileAndSetCurrentProfile =
	repository.touchCloudProfileAndSetCurrentProfile;
export const deleteCloudProfileWithData = repository.deleteProfileWithData;
