import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Card } from "@/lib/api/entities/card";
import { CardRow } from "./card-row";

const meta = {
	title: "Features/Cards/CardRow",
	component: CardRow,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof CardRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseCard: Card = {
	id: "card-1",
	card_pack_id: "pack-1",
	owner_user_id: "user-1",
	prompt: "What is React?",
	answer: "A JavaScript library for building user interfaces",
	status: "active",
	created_at: "2024-01-15T10:00:00Z",
	updated_at: "2024-01-15T10:00:00Z",
};

export const Default: Story = {
	args: {
		card: baseCard,
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const WithDueTimeSoon: Story = {
	args: {
		card: baseCard,
		dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const WithDueTimeToday: Story = {
	args: {
		card: baseCard,
		dueAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours from now
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const Overdue: Story = {
	args: {
		card: baseCard,
		dueAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const DueInFuture: Story = {
	args: {
		card: baseCard,
		dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const LongPrompt: Story = {
	args: {
		card: {
			...baseCard,
			prompt:
				"What are the key differences between React's useEffect and useLayoutEffect hooks, and when should you use each one?",
		},
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const LongAnswer: Story = {
	args: {
		card: {
			...baseCard,
			answer:
				"useEffect runs asynchronously after the browser paints the screen, making it ideal for most side effects like data fetching. useLayoutEffect runs synchronously after all DOM mutations but before the browser paints, which is useful when you need to make DOM measurements or mutations that must happen before the user sees the update.",
		},
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const NoAnswer: Story = {
	args: {
		card: {
			...baseCard,
			answer: "",
		},
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const ShortContent: Story = {
	args: {
		card: {
			...baseCard,
			prompt: "JSX?",
			answer: "Yes",
		},
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const SuspendedCard: Story = {
	args: {
		card: {
			...baseCard,
			status: "suspended",
			prompt: "Suspended card example",
		},
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};
