const LGBT_RELATED_EMOJI_UNIFIED_IDS: string[] = [
	"1f9d1-200d-1f91d-200d-1f9d1", // people holding hands
	"1f46d", // women holding hands
	"1f46b", // woman and man holding hands
	"1f46c", // men holding hands
	"1f48f", // couple
	"1f491", // couple with heart
	"1f469-200d-2764-fe0f-200d-1f468", // couple with heart: woman, man
	"1f468-200d-2764-fe0f-200d-1f468", // couple with heart: man, man
	"1f469-200d-2764-fe0f-200d-1f469", // couple with heart: woman, woman
	"1f469-200d-2764-fe0f-200d-1f48b-200d-1f468", // kiss: woman, man
	"1f468-200d-2764-fe0f-200d-1f48b-200d-1f468", // kiss: man, man
	"1f469-200d-2764-fe0f-200d-1f48b-200d-1f469", // kiss: woman, woman
	"1f468-200d-1f468-200d-1f466", // family: man, man, boy
	"1f468-200d-1f468-200d-1f467", // family: man, man, girl
	"1f468-200d-1f468-200d-1f467-200d-1f466", // family: man, man, girl, boy
	"1f468-200d-1f468-200d-1f466-200d-1f466", // family: man, man, boy, boy
	"1f468-200d-1f468-200d-1f467-200d-1f467", // family: man, man, girl, girl
	"1f469-200d-1f469-200d-1f466", // family: woman, woman, boy
	"1f469-200d-1f469-200d-1f467", // family: woman, woman, girl
	"1f469-200d-1f469-200d-1f467-200d-1f466", // family: woman, woman, girl, boy
	"1f469-200d-1f469-200d-1f466-200d-1f466", // family: woman, woman, boy, boy
	"1f469-200d-1f469-200d-1f467-200d-1f467", // family: woman, woman, girl, girl
	"26a7-fe0f", // transgender symbol
	"1f3f3-fe0f-200d-1f308", // rainbow flag
	"1f3f3-fe0f-200d-26a7-fe0f", // transgender flag
];

const CHILD_UNFRIENDLY_EMOJI_UNIFIED_IDS: string[] = [
	"1f6ac", // cigarette
	"1f37a", // beer mug
	"1f37b", // clinking beer mugs
	"1f942", // clinking glasses
	"1f378", // cocktail glass
	"1f379", // tropical drink
	"1f943", // tumbler glass
	"1f377", // wine glass
	"1f37e", // bottle with popping cork
	"1f376", // beverage (sake)
	"1f3b0", // slot machine
	"1f3b2", // game die
	"1f595", // middle finger
	"1f48b", // kiss mark
	"1f460", // high heeled shoe
	"1fa72", // bathing suit
	"1f459", // clothing (bikini)
	"1f484", // cosmetics (lipstick)
	"1f52a", // kitchen knife
	"1f5e1-fe0f", // weapon (dagger)
	"2694-fe0f", // crossed swords
	"1fa93", // hatchet
	"1f4a3", // comic (bomb)
	"1f52b", // water pistol
	"2620-fe0f", // skull and crossbones
	"26b0-fe0f", // coffin
	"1faa6", // tombstone
	"26d3-fe0f", // chains
	"1f489", // medicine (syringe)
	"1f48a", // medicine (pill)
];

export const SAFE_EMOJI_HIDDEN_UNIFIED_IDS: string[] = Array.from(
	new Set([
		...LGBT_RELATED_EMOJI_UNIFIED_IDS,
		...CHILD_UNFRIENDLY_EMOJI_UNIFIED_IDS,
	]),
);

export const PROFILE_EMOJI_HIDDEN_UNIFIED_IDS = SAFE_EMOJI_HIDDEN_UNIFIED_IDS;
