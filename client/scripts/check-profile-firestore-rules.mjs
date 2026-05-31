import { readFileSync } from "node:fs";

import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, writeBatch } from "firebase/firestore";

const projectId = `card-master-rules-${Date.now()}`;
const now = "2026-01-02T00:00:00.000Z";

function profile(id, accountUserId) {
	return {
		id,
		account_user_id: accountUserId,
		nickname: id,
		avatar_emoji: "🙂",
		primary_color: null,
		hanzi_font: "default",
		sidebar_background: "nav-illustration",
		daily_goal: 20,
		review_per_day: 10,
		new_per_day: 10,
		created_at: now,
		updated_at: null,
		last_used_at: now,
	};
}

const testEnv = await initializeTestEnvironment({
	projectId,
	firestore: {
		rules: readFileSync("firestore.rules", "utf8"),
	},
});

try {
	const accountUserId = "account-1";
	const db = testEnv.authenticatedContext(accountUserId).firestore();

	await assertSucceeds(
		setDoc(doc(db, "users", accountUserId), {
			id: accountUserId,
			email: "user@example.com",
			display_name: "User",
			photo_url: null,
			current_profile_id: null,
			created_at: now,
			updated_at: now,
		}),
	);

	const createBatch = writeBatch(db);
	createBatch.set(doc(db, "profiles", "profile-create"), profile("profile-create", accountUserId));
	createBatch.set(
		doc(db, "users", accountUserId),
		{
			current_profile_id: "profile-create",
			updated_at: "2026-01-03T00:00:00.000Z",
		},
		{ merge: true },
	);
	await assertSucceeds(createBatch.commit());

	const firstLaunchDb = testEnv
		.authenticatedContext("first-launch-account")
		.firestore();
	const firstLaunchBatch = writeBatch(firstLaunchDb);
	firstLaunchBatch.set(
		doc(firstLaunchDb, "profiles", "profile-first"),
		profile("profile-first", "first-launch-account"),
	);
	firstLaunchBatch.set(
		doc(firstLaunchDb, "users", "first-launch-account"),
		{
			current_profile_id: "profile-first",
			updated_at: "2026-01-03T00:00:00.000Z",
		},
		{ merge: true },
	);
	await assertSucceeds(firstLaunchBatch.commit());

	const secondFirstLaunchBatch = writeBatch(firstLaunchDb);
	secondFirstLaunchBatch.set(
		doc(firstLaunchDb, "profiles", "profile-second"),
		profile("profile-second", "first-launch-account"),
	);
	secondFirstLaunchBatch.set(
		doc(firstLaunchDb, "users", "first-launch-account"),
		{
			current_profile_id: "profile-second",
			updated_at: "2026-01-04T00:00:00.000Z",
		},
		{ merge: true },
	);
	await assertSucceeds(secondFirstLaunchBatch.commit());

	const otherDb = testEnv.authenticatedContext("account-2").firestore();
	await assertFails(
		setDoc(doc(otherDb, "profiles", "bad-profile"), profile("bad-profile", accountUserId)),
	);

	console.log("Profile Firestore rules checks passed.");
} finally {
	await testEnv.cleanup();
}
