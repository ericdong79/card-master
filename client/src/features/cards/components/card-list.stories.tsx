import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Card } from "@/lib/api/entities/card";
import { CardList } from "./card-list";

const meta = {
	title: "Features/Cards/CardList",
	component: CardList,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof CardList>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockCards: Card[] = [
	{
		id: "card-1",
		card_pack_id: "pack-1",
		owner_user_id: "user-1",
		prompt: "What is React?",
		answer: "A JavaScript library for building user interfaces",
		status: "active",
		created_at: "2024-01-15T10:00:00Z",
		updated_at: "2024-01-15T10:00:00Z",
	},
	{
		id: "card-2",
		card_pack_id: "pack-1",
		owner_user_id: "user-1",
		prompt: "What is JSX?",
		answer:
			"A syntax extension for JavaScript that allows you to write HTML-like code in React",
		status: "active",
		created_at: "2024-01-16T11:00:00Z",
		updated_at: "2024-01-16T11:00:00Z",
	},
	{
		id: "card-3",
		card_pack_id: "pack-1",
		owner_user_id: "user-1",
		prompt: "What are React Hooks?",
		answer:
			"Functions that let you use state and other React features in functional components",
		status: "active",
		created_at: "2024-01-17T12:00:00Z",
		updated_at: "2024-01-17T12:00:00Z",
	},
];

export const Default: Story = {
	args: {
		cards: mockCards,
		onCreateClick: () => console.log("Create card"),
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const Empty: Story = {
	args: {
		cards: [],
		onCreateClick: () => console.log("Create card"),
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const SingleCard: Story = {
	args: {
		cards: [mockCards[0]],
		onCreateClick: () => console.log("Create card"),
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const ManyCards: Story = {
	args: {
		cards: Array.from({ length: 10 }, (_, i) => ({
			...mockCards[i % 3],
			id: `card-${i + 1}`,
			prompt: `Question ${i + 1}: ${mockCards[i % 3].prompt}`,
			created_at: new Date(2024, 0, i + 1).toISOString(),
		})),
		onCreateClick: () => console.log("Create card"),
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const MixedContent: Story = {
	args: {
		cards: [
			mockCards[0],
			{
				...mockCards[1],
				answer: "",
			},
			{
				...mockCards[2],
				prompt:
					"What are the key differences between React's useEffect and useLayoutEffect hooks, and when should you use each one?",
			},
		],
		onCreateClick: () => console.log("Create card"),
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};
