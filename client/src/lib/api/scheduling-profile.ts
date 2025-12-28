import type { SupabaseClient } from "@supabase/supabase-js";
import { SM2_DEFAULT_PARAMETERS } from "../scheduling/sm2";
import type { SchedulingProfileInsert } from "./dtos/scheduling-profile";
import type { SchedulingProfile } from "./entities/scheduling-profile";

const DEFAULT_PROFILE: Omit<SchedulingProfileInsert, "owner_user_id"> = {
	algorithm_key: "sm2",
	version: 1,
	parameters: { ...SM2_DEFAULT_PARAMETERS },
};

export async function fetchSchedulingProfile(
	supabase: SupabaseClient,
	ownerUserId: string,
): Promise<SchedulingProfile | null> {
	const { data, error } = await supabase
		.from("scheduling_profile")
		.select("*")
		.eq("owner_user_id", ownerUserId)
		.order("created_at", { ascending: true })
		.limit(1);

	if (error) {
		throw error;
	}

	return data?.[0] ?? null;
}

export async function createSchedulingProfile(
	supabase: SupabaseClient,
	ownerUserId: string,
	overrides: Partial<SchedulingProfileInsert> = {},
): Promise<SchedulingProfile> {
	const payload: SchedulingProfileInsert = {
		...DEFAULT_PROFILE,
		...overrides,
		owner_user_id: ownerUserId,
	};

	const { data, error } = await supabase
		.from("scheduling_profile")
		.insert(payload)
		.select("*")
		.single();

	if (error || !data) {
		throw error ?? new Error("Failed to create scheduling profile");
	}

	return data;
}

export async function getOrCreateSchedulingProfile(
	supabase: SupabaseClient,
	ownerUserId: string,
): Promise<SchedulingProfile> {
	const existing = await fetchSchedulingProfile(supabase, ownerUserId);
	if (existing) return existing;
	return createSchedulingProfile(supabase, ownerUserId);
}
