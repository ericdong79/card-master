import type { Meta, StoryObj } from "@storybook/react";
import { BrowserRouter } from "react-router-dom";
import type { Card } from "@/lib/api/entities/card";
import { PackCardsContent } from "./pack-cards-content";

const meta = {
	title: "Features/Cards/PackCardsContent",
	component: PackCardsContent,
	parameters: {
		layout: "padded",
	},
	decorators: [
		(Story) => (
			<BrowserRouter>
				<Story />
			</BrowserRouter>
		),
	],
	tags: ["autodocs"],
} satisfies Meta<typeof PackCardsContent>;

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

export const WithCards: Story = {
	args: {
		packName: "React Fundamentals",
		cards: mockCards,
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const Empty: Story = {
	args: {
		packName: "Empty Pack",
		cards: [],
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const Loading: Story = {
	args: {
		packName: undefined,
		cards: [],
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const SingleCard: Story = {
	args: {
		packName: "Single Card Pack",
		cards: [mockCards[0]],
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};

export const ManyCards: Story = {
	args: {
		packName: "Large Pack",
		cards: Array.from({ length: 10 }, (_, i) => ({
			...mockCards[i % 3],
			id: `card-${i + 1}`,
			prompt: `Question ${i + 1}: ${mockCards[i % 3].prompt}`,
			created_at: new Date(2024, 0, i + 1).toISOString(),
		})),
		onEdit: (card) => console.log("Edit card:", card),
		onDelete: (card) => console.log("Delete card:", card),
	},
};
