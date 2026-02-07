import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { Card as CardEntity } from "@/lib/api/entities/card";
import type { ReviewGrade } from "@/lib/scheduling/types";
import type { Sm2State, Sm2Parameters } from "@/lib/scheduling/types/sm2-types";
import type { SimpleReviewResult } from "./review-buttons-config";
import { ReviewCard } from "./review-card";

const mockCard: CardEntity = {
	id: "card-1",
	prompt: "What is the capital of France?",
	answer: "Paris is the capital and most populous city of France. It is located on the Seine River in the north of the country.",
	card_pack_id: "pack-1",
	owner_user_id: "user-1",
	status: "active",
	created_at: new Date().toISOString(),
	updated_at: null,
};

const mockCardCode: CardEntity = {
	id: "card-2",
	prompt: "What does the 'map' function do in JavaScript?",
	answer: "The map() method creates a new array populated with the results of calling a provided function on every element in the calling array.",
	card_pack_id: "pack-1",
	owner_user_id: "user-1",
	status: "active",
	created_at: new Date().toISOString(),
	updated_at: null,
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
	status: "active",
	created_at: new Date().toISOString(),
	updated_at: null,
};

const logSimpleReview = (result: SimpleReviewResult) =>
	console.log("Review result:", result);
const logGrade = (grade: ReviewGrade) => console.log("Grade:", grade);

// Default SM-2 parameters
const defaultSm2Params: Sm2Parameters = {
	learningSteps: ["1m", "10m"],
	relearningSteps: ["10m"],
	easyInterval: "4d",
	startingEase: 2.5,
	easyBonus: 1.3,
	intervalMultiplier: 1.0,
	maxInterval: "365d",
	forgotInterval: "1m",
	lapseIntervalMultiplier: 0.5,
	minimumEase: 1.3,
};

// Different SM-2 states for testing dynamic intervals
const newCardState: Sm2State | null = null;

const learningCardState: Sm2State = {
	schema_version: 1,
	algorithm: "sm2",
	phase: "learning",
	ease: 2.5,
	intervalDays: 0,
	repetitions: 0,
	lapses: 0,
	stepIndex: 0,
	pendingIntervalDays: null,
	updated_at: new Date().toISOString(),
	lastReviewedAt: null,
};

const reviewCardState: Sm2State = {
	schema_version: 1,
	algorithm: "sm2",
	phase: "review",
	ease: 2.5,
	intervalDays: 3,
	repetitions: 3,
	lapses: 0,
	stepIndex: 0,
	pendingIntervalDays: null,
	updated_at: new Date().toISOString(),
	lastReviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
};

const matureCardState: Sm2State = {
	schema_version: 1,
	algorithm: "sm2",
	phase: "review",
	ease: 2.2,
	intervalDays: 30,
	repetitions: 10,
	lapses: 1,
	stepIndex: 0,
	pendingIntervalDays: null,
	updated_at: new Date().toISOString(),
	lastReviewedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

const relearningCardState: Sm2State = {
	schema_version: 1,
	algorithm: "sm2",
	phase: "relearning",
	ease: 2.3,
	intervalDays: 14,
	repetitions: 5,
	lapses: 1,
	stepIndex: 0,
	pendingIntervalDays: 7,
	updated_at: new Date().toISOString(),
	lastReviewedAt: new Date().toISOString(),
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
		onReview: logSimpleReview,
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
		onReview: logSimpleReview,
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
		onReview: logSimpleReview,
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
		onReview: logSimpleReview,
		isProcessing: true,
	},
};

export const SimpleModeNoPackName: Story = {
	args: {
		mode: "simple",
		card: mockCard,
		learnedCount: 1,
		totalCards: 3,
		onReview: logSimpleReview,
		isProcessing: false,
	},
};

// SM-2 mode stories with dynamic intervals
export const Sm2ModeNewCard: Story = {
	args: {
		mode: "sm2",
		card: mockCardCode,
		packName: "JavaScript Fundamentals",
		learnedCount: 0,
		totalCards: 10,
		onGrade: logGrade,
		isProcessing: false,
		state: newCardState,
		params: defaultSm2Params,
	},
	parameters: {
		docs: {
			description: {
				story: "New card in learning phase. Intervals: Again=<1m, Hard=<1m, Good=10m, Easy=4d",
			},
		},
	},
};

export const Sm2ModeLearning: Story = {
	args: {
		mode: "sm2",
		card: mockCardCode,
		packName: "JavaScript Fundamentals",
		learnedCount: 2,
		totalCards: 10,
		onGrade: logGrade,
		isProcessing: false,
		state: learningCardState,
		params: defaultSm2Params,
	},
	parameters: {
		docs: {
			description: {
				story: "Card in learning phase (step 0). Shows dynamic intervals based on current step.",
			},
		},
	},
};

export const Sm2ModeReview: Story = {
	args: {
		mode: "sm2",
		card: mockCardCode,
		packName: "JavaScript Fundamentals",
		learnedCount: 5,
		totalCards: 10,
		onGrade: logGrade,
		isProcessing: false,
		state: reviewCardState,
		params: defaultSm2Params,
	},
	parameters: {
		docs: {
			description: {
				story: "Card in review phase (3 days interval). Intervals are calculated based on current ease (2.5) and interval.",
			},
		},
	},
};

export const Sm2ModeMature: Story = {
	args: {
		mode: "sm2",
		card: mockCardCode,
		packName: "JavaScript Fundamentals",
		learnedCount: 8,
		totalCards: 10,
		onGrade: logGrade,
		isProcessing: false,
		state: matureCardState,
		params: defaultSm2Params,
	},
	parameters: {
		docs: {
			description: {
				story: "Mature card (30 days interval, lower ease 2.2). Shows longer intervals and effect of past lapse.",
			},
		},
	},
};

export const Sm2ModeRelearning: Story = {
	args: {
		mode: "sm2",
		card: mockCardCode,
		packName: "JavaScript Fundamentals",
		learnedCount: 5,
		totalCards: 10,
		onGrade: logGrade,
		isProcessing: false,
		state: relearningCardState,
		params: defaultSm2Params,
	},
	parameters: {
		docs: {
			description: {
				story: "Card in relearning phase after a lapse. Shows relearning step intervals and pending interval for graduation.",
			},
		},
	},
};

export const Sm2ModeProcessing: Story = {
	args: {
		mode: "sm2",
		card: mockCardCode,
		packName: "JavaScript Fundamentals",
		learnedCount: 5,
		totalCards: 10,
		onGrade: logGrade,
		isProcessing: true,
		state: reviewCardState,
		params: defaultSm2Params,
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
		onReview: logSimpleReview,
		isProcessing: false,
	},
};

export const Sm2ModeLongContent: Story = {
	args: {
		mode: "sm2",
		card: mockCardLong,
		packName: "Advanced JavaScript",
		learnedCount: 3,
		totalCards: 8,
		onGrade: logGrade,
		isProcessing: false,
		state: reviewCardState,
		params: defaultSm2Params,
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

// Interactive SM-2 story showing dynamic intervals
export const Sm2ModeInteractive = () => {
	const [learnedCount, setLearnedCount] = useState(0);

	// Simulate different card states
	const states: (Sm2State | null)[] = [
		null, // New card
		learningCardState,
		reviewCardState,
		matureCardState,
	];
	const currentState = states[learnedCount % states.length];

	const stateLabels = ["New", "Learning", "Review (3d)", "Mature (30d)"];

	const handleGrade = (grade: ReviewGrade) => {
		console.log("Grade:", grade);
		if (grade !== "again") {
			setLearnedCount((prev) => prev + 1);
		}
	};

	return (
		<div className="space-y-4">
			<div className="text-sm text-muted-foreground text-center">
				Current card type: <strong>{stateLabels[learnedCount % states.length]}</strong>
				<br />
				Notice how the intervals change based on card state!
			</div>
			<ReviewCard
				mode="sm2"
				card={mockCardCode}
				packName="Interactive SM-2 Demo"
				learnedCount={learnedCount}
				totalCards={10}
				onGrade={handleGrade}
				isProcessing={false}
				state={currentState}
				params={defaultSm2Params}
			/>
		</div>
	);
};

Sm2ModeInteractive.storyName = "SM-2 Mode (Interactive - Dynamic Intervals)";
Sm2ModeInteractive.parameters = {
	docs: {
		description: {
			story: "Click any grade button (except 'Again') to cycle through different card states (New → Learning → Review → Mature). Watch how the intervals dynamically change based on the card's SM-2 state!",
		},
	},
};
