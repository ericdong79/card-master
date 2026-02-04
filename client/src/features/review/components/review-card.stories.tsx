import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ReviewCard } from "./review-card";
import type { Card as CardEntity } from "@/lib/api/entities/card";

const mockCard: CardEntity = {
	id: "card-1",
	prompt: "What is the capital of France?",
	answer: "Paris is the capital and most populous city of France. It is located on the Seine River in the north of the country.",
	card_pack_id: "pack-1",
	owner_user_id: "user-1",
	created_at: new Date().toISOString(),
};

const mockCardCode: CardEntity = {
	id: "card-2",
	prompt: "What does the 'map' function do in JavaScript?",
	answer: "The map() method creates a new array populated with the results of calling a provided function on every element in the calling array.",
	card_pack_id: "pack-1",
	owner_user_id: "user-1",
	created_at: new Date().toISOString(),
};

const mockCardLong: CardEntity = {
	id: "card-3",
	prompt: "Explain the concept of closures in JavaScript and provide a practical example of when you would use them.",
	answer: `A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment). In other words, a closure gives you access to an outer function's scope from an inner function. 

Example:
function makeCounter() {
  let count = 0;
  return function() {
    return ++count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2`,
	card_pack_id: "pack-1",
	owner_user_id: "user-1",
	created_at: new Date().toISOString(),
};

const meta = {
	title: "Features/Review/ReviewCard",
	component: ReviewCard,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof ReviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Simple mode stories
export const SimpleModeInitial: Story = {
	args: {
		mode: "simple",
		card: mockCard,
		packName: "Geography Basics",
		learnedCount: 0,
		totalCards: 5,
		onReview: (result) => console.log("Review result:", result),
		isProcessing: false,
	},
};

export const SimpleModeInProgress: Story = {
	args: {
		mode: "simple",
		card: mockCard,
		packName: "Geography Basics",
		learnedCount: 2,
		totalCards: 5,
		onReview: (result) => console.log("Review result:", result),
		isProcessing: false,
	},
};

export const SimpleModeAlmostComplete: Story = {
	args: {
		mode: "simple",
		card: mockCard,
		packName: "Geography Basics",
		learnedCount: 4,
		totalCards: 5,
		onReview: (result) => console.log("Review result:", result),
		isProcessing: false,
	},
};

export const SimpleModeProcessing: Story = {
	args: {
		mode: "simple",
		card: mockCard,
		packName: "Geography Basics",
		learnedCount: 2,
		totalCards: 5,
		onReview: (result) => console.log("Review result:", result),
		isProcessing: true,
	},
};

export const SimpleModeNoPackName: Story = {
	args: {
		mode: "simple",
		card: mockCard,
		learnedCount: 1,
		totalCards: 3,
		onReview: (result) => console.log("Review result:", result),
		isProcessing: false,
	},
};

// SM-2 mode stories
export const Sm2ModeInitial: Story = {
	args: {
		mode: "sm2",
		card: mockCardCode,
		packName: "JavaScript Fundamentals",
		learnedCount: 0,
		totalCards: 10,
		onGrade: (grade) => console.log("Grade:", grade),
		isProcessing: false,
	},
};

export const Sm2ModeInProgress: Story = {
	args: {
		mode: "sm2",
		card: mockCardCode,
		packName: "JavaScript Fundamentals",
		learnedCount: 5,
		totalCards: 10,
		onGrade: (grade) => console.log("Grade:", grade),
		isProcessing: false,
	},
};

export const Sm2ModeProcessing: Story = {
	args: {
		mode: "sm2",
		card: mockCardCode,
		packName: "JavaScript Fundamentals",
		learnedCount: 5,
		totalCards: 10,
		onGrade: (grade) => console.log("Grade:", grade),
		isProcessing: true,
	},
};

// Long content stories
export const SimpleModeLongContent: Story = {
	args: {
		mode: "simple",
		card: mockCardLong,
		packName: "Advanced JavaScript",
		learnedCount: 3,
		totalCards: 8,
		onReview: (result) => console.log("Review result:", result),
		isProcessing: false,
	},
};

// Interactive story to demonstrate the full flow
export const SimpleModeInteractive = () => {
	const [learnedCount, setLearnedCount] = useState(0);
	const [currentCardIndex, setCurrentCardIndex] = useState(0);

	const cards = [mockCard, mockCardCode, mockCardLong];
	const currentCard = cards[currentCardIndex % cards.length];

	const handleReview = (result: "forgot" | "remembered") => {
		console.log("Review result:", result);
		if (result === "remembered") {
			setLearnedCount((prev) => prev + 1);
		}
		setCurrentCardIndex((prev) => prev + 1);
	};

	return (
		<ReviewCard
			mode="simple"
			card={currentCard}
			packName="Interactive Demo Pack"
			learnedCount={learnedCount}
			totalCards={5}
			onReview={handleReview}
			isProcessing={false}
		/>
	);
};

SimpleModeInteractive.storyName = "Simple Mode (Interactive)";
SimpleModeInteractive.parameters = {
	docs: {
		description: {
			story: "Click 'Remembered' to see the progress bar update. The card content cycles through different examples.",
		},
	},
};

// Interactive SM-2 story
export const Sm2ModeInteractive = () => {
	const [learnedCount, setLearnedCount] = useState(0);
	const [currentCardIndex, setCurrentCardIndex] = useState(0);

	const cards = [mockCard, mockCardCode, mockCardLong];
	const currentCard = cards[currentCardIndex % cards.length];

	const handleGrade = (grade: string) => {
		console.log("Grade:", grade);
		if (grade !== "again") {
			setLearnedCount((prev) => prev + 1);
		}
		setCurrentCardIndex((prev) => prev + 1);
	};

	return (
		<ReviewCard
			mode="sm2"
			card={currentCard}
			packName="Interactive SM-2 Demo"
			learnedCount={learnedCount}
			totalCards={5}
			onGrade={handleGrade}
			isProcessing={false}
		/>
	);
};

Sm2ModeInteractive.storyName = "SM-2 Mode (Interactive)";
Sm2ModeInteractive.parameters = {
	docs: {
		description: {
			story: "Click any grade button to see the progress bar update. 'Again' does not increase progress.",
		},
	},
};
