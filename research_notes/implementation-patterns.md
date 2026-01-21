# Practical Implementation Patterns for Spaced Repetition Systems

## Summary

Spaced repetition systems have evolved significantly from the original SM-2 algorithm to modern implementations like FSRS (Free Spaced Repetition Scheduler). The field now offers robust, production-ready implementations across multiple programming ecosystems, with well-documented patterns for scheduling, data persistence, and application architecture.

Modern systems typically use one of three algorithm families: SM-2 (classic, widely implemented), FSRS (modern, research-backed, adaptive), or simpler Leitner systems. The consensus favors FSRS for new implementations due to its superior performance and ability to handle overdue reviews gracefully, though SM-2 remains popular for its simplicity and familiarity.

Database patterns range from SQLite-based relational designs (Anki's approach) to file-based markdown systems (emerging trend for developer-friendly apps). Architecture patterns consistently separate the scheduling algorithm from data persistence and presentation layers, with clean architecture and domain-driven design being common approaches.

## Code Examples

### SM-2 Algorithm Implementation (ES6 JavaScript)

```javascript
// SM-2 Algorithm Core Function
function sm2(quality, repetitions, easeFactor, interval) {
  // Quality: 0-5 (0=blackout, 5=perfect response)
  // Repetitions: Number of prior reviews
  // EaseFactor: Floating point >= 1.3 (default 2.5)
  // Interval: Days until next review (default 0)

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    // Incorrect response
    repetitions = 0;
    interval = 1;
  }

  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  return { interval, repetitions, easeFactor };
}
```

### FSRS Algorithm Core Concepts (TypeScript)

```typescript
// FSRS (Free Spaced Repetition Scheduler) Structure
interface CardState {
  stability: number;      // S: Interval when R=90%
  difficulty: number;     // D: 1-10 scale
  retrievability: number; // R: Probability of recall (0-1)
  due: Date;
  reps: number;
}

interface FSRSParameters {
  request_retention: number;  // Target retention (default 0.9)
  maximum_interval: number;   // Max days between reviews
  weights: number[];          // Algorithm weights (19-21 parameters)
}

// Key formula for retrievability
function calculateRetrievability(t: number, S: number): number {
  // R(t,S) = (1 + FACTOR * t/S)^DECAY
  const FACTOR = 0.9 ** (-1/DECAY) - 1;
  return (1 + FACTOR * (t / S)) ** DECAY;
}

// Stability after successful review (FSRS-4)
function calculateNewStability(
  D: number,
  S: number,
  R: number,
  G: number, // Grade: 1=again, 2=hard, 3=good, 4=easy
  weights: number[]
): number {
  const S_prime = S * (
    Math.exp(weights[8]) *
    (11 - D) *
    Math.pow(S, -weights[9]) *
    (Math.exp(weights[10] * (1 - R)) - 1) *
    weights[15] * (G === 2 ? 1 : 1) *
    weights[16] * (G === 4 ? 1 : 1) +
    1
  );
  return S_prime;
}
```

### Basic Card Data Structure

```typescript
// Generic card representation
interface Card {
  id: string;
  noteId: string;
  deckId: string;
  state: 'new' | 'learning' | 'review' | 'relearning';
  due: Date;
  interval: number;        // Days until next review
  easeFactor: number;      // SM-2 factor (multiplier)
  stability: number;        // FSRS stability
  difficulty: number;       // FSRS difficulty
  reps: number;           // Total reviews
  lapses: number;         // Times forgotten
  lastReview: Date | null;
  flags: number;          // User flags
}
```

### Review Queue Management

```typescript
class ReviewQueue {
  private dueCards: Card[] = [];
  private learningCards: Card[] = [];

  constructor(
    private scheduler: Scheduler,
    private cardRepository: CardRepository
  ) {}

  async fetchDueCards(deckId: string, limit: number): Promise<Card[]> {
    const now = new Date();

    // Get cards due for review
    this.dueCards = await this.cardRepository.findDue(deckId, now);

    // Get cards in learning state (short intervals)
    this.learningCards = await this.cardRepository.findLearning(deckId, now);

    // Prioritize learning cards
    return [...this.learningCards, ...this.dueCards].slice(0, limit);
  }

  async submitReview(cardId: string, rating: Rating): Promise<void> {
    const card = await this.cardRepository.findById(cardId);
    const now = new Date();

    // Apply scheduling algorithm
    const updatedCard = this.scheduler.schedule(card, rating, now);

    // Save updated state
    await this.cardRepository.update(updatedCard);

    // Log review for analysis
    await this.logReview(cardId, rating, now);
  }
}
```

## Architecture Patterns

### Clean Architecture for Flashcard Apps

```
┌─────────────────────────────────────────┐
│         Presentation Layer            │
│  (UI Components, ViewModels)         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Application Layer               │
│  (Use Cases, Services, Queues)      │
│                                   │
│  • ReviewQueue                     │
│  • DeckService                    │
│  • CardService                    │
│  • StatisticsService               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Domain Layer                │
│  (Business Logic, Algorithms)       │
│                                   │
│  • Scheduler (SM2/FSRS)          │
│  • Card Entity                   │
│  • Deck Entity                   │
│  • ReviewLog Entity              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Infrastructure Layer            │
│  (Data Access, External APIs)       │
│                                   │
│  • SQLite/PostgreSQL              │
│  • File System                   │
│  • Cloud Sync                    │
└─────────────────────────────────────┘
```

### Separation of Concerns

**Scheduler Service Pattern:**
```typescript
// Pure scheduling algorithm - no side effects
interface Scheduler {
  schedule(card: Card, rating: Rating, now: Date): CardState;
  calculateDueDate(state: CardState): Date;
  calculateRetrievability(card: Card, now: Date): number;
}

// Example FSRS Scheduler
class FSRSScheduler implements Scheduler {
  constructor(private params: FSRSParameters) {}

  schedule(card: Card, rating: Rating, now: Date): CardState {
    // Pure function - returns new state
    // No I/O, no database access
    // Easy to test, easy to replace
  }
}
```

**Repository Pattern:**
```typescript
// Data access abstraction
interface CardRepository {
  findById(id: string): Promise<Card>;
  findDue(deckId: string, now: Date): Promise<Card[]>;
  findLearning(deckId: string, now: Date): Promise<Card[]>;
  save(card: Card): Promise<void>;
  update(card: Card): Promise<void>;
  delete(id: string): Promise<void>;
}

// SQLite implementation
class SQLiteCardRepository implements CardRepository {
  constructor(private db: Database) {}
  // Implementation details hidden from domain layer
}
```

### Testing Approaches

**Algorithm Unit Testing:**
```typescript
describe('SM2 Scheduler', () => {
  it('calculates correct intervals for new cards', () => {
    const card = createMockCard({ state: 'new' });
    const result = scheduler.schedule(card, Rating.Good, now);

    expect(result.interval).toBe(1);
    expect(result.reps).toBe(1);
  });

  it('resets repetitions on incorrect answer', () => {
    const card = createMockCard({ reps: 5, interval: 10 });
    const result = scheduler.schedule(card, Rating.Again, now);

    expect(result.reps).toBe(0);
    expect(result.interval).toBe(1);
  });
});
```

**Integration Testing:**
```typescript
describe('Review Workflow', () => {
  it('processes review queue end-to-end', async () => {
    const deck = await createTestDeck();
    const cards = await createTestCards(10, deck.id);

    const queue = new ReviewQueue(scheduler, cardRepo);
    const dueCards = await queue.fetchDueCards(deck.id, 5);

    expect(dueCards.length).toBe(5);

    for (const card of dueCards) {
      await queue.submitReview(card.id, Rating.Good);
    }

    const updated = await cardRepo.findById(dueCards[0].id);
    expect(updated.lastReview).toBeDefined();
  });
});
```

## Language-Specific Considerations

### JavaScript/TypeScript Implementations

**Key Libraries:**
- `ts-fsrs` - TypeScript FSRS implementation (recommended)
- `fsrs.js` - JavaScript FSRS (deprecated, use ts-fsrs)
- `supermemo2.js` - SM-2 implementation
- `sm2-javascript` - Simple SM-2 implementation

**Patterns:**
```typescript
// Type-safe card state management
type CardState = 'New' | 'Learning' | 'Review' | 'Relearning';

type Rating = 'Again' | 'Hard' | 'Good' | 'Easy';

interface Review {
  cardId: string;
  rating: Rating;
  timestamp: Date;
  timeTaken: number; // milliseconds
}

// Async/await for database operations
async function processReviewQueue(userId: string) {
  const queue = await getReviewQueue(userId);
  for (const card of queue) {
    await processCard(card);
  }
}
```

**Node.js + SQLite Example:**
```typescript
import Database from 'better-sqlite3';

const db = new Database('cards.anki2');

// Schema creation
db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY,
    note_id INTEGER NOT NULL,
    deck_id INTEGER NOT NULL,
    due INTEGER NOT NULL,
    ivl INTEGER NOT NULL,
    factor INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    state INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(deck_id, due);
`);

// Query for due cards
const getDueCards = (deckId: number, now: Date) => {
  return db.prepare(`
    SELECT * FROM cards
    WHERE deck_id = ? AND due <= ?
    ORDER BY due ASC
    LIMIT 20
  `).all(deckId, Math.floor(now.getTime() / 1000));
};
```

### Python Implementations

**Key Libraries:**
- `py-fsrs` - Python FSRS package
- `sm-2` - SM-2 Python package
- `anki` - Anki's Python library (for analysis)

**Patterns:**
```python
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal

@dataclass
class Card:
    id: str
    state: Literal['new', 'learning', 'review', 'relearning']
    due: datetime
    interval: int  # days
    stability: float
    difficulty: float
    reps: int
    lapses: int

class SM2Scheduler:
    def __init__(self, initial_ease: float = 2.5):
        self.min_ease = 1.3

    def schedule(self, card: Card, rating: int, now: datetime) -> Card:
        # rating: 0-5 (0=blackout, 5=perfect)
        if rating >= 3:
            if card.reps == 0:
                card.interval = 1
            elif card.reps == 1:
                card.interval = 6
            else:
                card.interval = int(card.interval * card.ease_factor)
            card.reps += 1
            card.ease_factor += 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)
        else:
            card.reps = 0
            card.interval = 1

        card.ease_factor = max(card.ease_factor, self.min_ease)
        card.due = now + timedelta(days=card.interval)
        return card
```

**Using py-fsrs:**
```python
from fsrs import FSRS, Card, ReviewLog, Rating, State

# Initialize scheduler
fsrs = FSRS()
card = Card()

# Schedule card
now = datetime(2022, 11, 29, 12, 30, 0)
scheduling_cards = fsrs.repeat(card, now)

# Get next state for each rating
again_card = scheduling_cards[Rating.Again].card
hard_card = scheduling_cards[Rating.Hard].card
good_card = scheduling_cards[Rating.Good].card
easy_card = scheduling_cards[Rating.Easy].card
```

### Other Languages

**Rust:**
- `fsrs` crate - FSRS implementation with optimizer
- Pattern: Zero-cost abstractions, memory-safe, excellent for high-performance applications

```rust
use fsrs::{FSRS, Card, State, Rating};

let fsrs = FSRS::new(Some(FSRSParameters::default()));
let mut card = Card::new();
let now = Utc.with_ymd_and_hms(2022, 11, 29, 12, 30, 0).unwrap();

let scheduling_cards = fsrs.repeat(&card, now);
let good_card = scheduling_cards[Rating::Good].card;
```

**Go:**
- `go-fsrs` - FSRS implementation
- Pattern: Simplicity, great for web services

```go
import "github.com/open-spaced-repetition/go-fsrs"

fsrs := fsrs.NewFSRS(nil)
card := fsrs.NewCard()
now := time.Date(2022, 11, 29, 12, 30, 0, 0, time.UTC)

schedulingCards := fsrs.Repeat(card, now)
goodCard := schedulingCards[fsrs.RatingGood].Card
```

**Dart/Flutter:**
- `dart-fsrs` - FSRS for Flutter apps
- Pattern: Reactive, widget-based UI with BLoC or Provider state management

## Sources

1. https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm - Complete FSRS algorithm documentation with mathematical formulas for all versions (v1 through v6)

2. https://github.com/cnnrhill/sm-2 - ES6 implementation of SM-2 algorithm with detailed explanation of the algorithm logic

3. https://github.com/ankidroid/Anki-Android/wiki/Database-Structure - Comprehensive Anki database schema documentation with tables, indexes, and JSON structures

4. https://www.natemeyvis.com/on-ankis-database/ - Analysis of Anki's database design patterns and architectural decisions

5. https://github.com/open-spaced-repetition/awesome-fsrs - Curated list of FSRS implementations across 20+ programming languages and applications

6. https://crates.io/crates/fsrs - Rust FSRS crate documentation

7. https://github.com/open-spaced-repetition/fsrs.js - JavaScript FSRS implementation with TypeScript types

8. https://github.com/walterscarborough/LibSpacey - C++ SM-2 implementation with cross-platform bindings (iOS, Android, TypeScript)

9. https://github.com/jabibamman/leitner-system - Leitner system implementation using SOLID principles and hexagonal architecture

10. https://borretti.me/article/hashcards-plain-text-spaced-repetition - File-based SRS using Markdown files instead of database

11. https://github.com/ig3/srf - Node.js web server implementation of spaced repetition

12. https://github.com/denismegerle/drt-flashcards - Flutter flashcard app with data model and local storage

13. https://github.com/open-spaced-repetition/py-fsrs - Python FSRS package with scheduler and optimizer

14. https://github.com/DavidMiserak/GoCard - Go-based file-based SRS using Markdown

15. https://github.com/zsh-eng/spaced2 - Beautiful local-first flashcards implementation

## Common Patterns

### Scheduling Service Patterns

**Factory Pattern for Algorithm Selection:**
```typescript
class SchedulerFactory {
  static create(type: 'sm2' | 'fsrs' | 'leitner', params?: any): Scheduler {
    switch (type) {
      case 'sm2':
        return new SM2Scheduler(params?.easeFactor || 2.5);
      case 'fsrs':
        return new FSRSScheduler(params || FSRSParameters.default());
      case 'leitner':
        return new LeitnerScheduler(params?.boxes || 5);
      default:
        throw new Error(`Unknown scheduler type: ${type}`);
    }
  }
}

// Usage
const scheduler = SchedulerFactory.create('fsrs', { request_retention: 0.9 });
```

**Strategy Pattern for Different Algorithms:**
```typescript
interface SchedulingStrategy {
  calculateNextReview(card: Card, rating: Rating, now: Date): ScheduledCard;
}

class SM2Strategy implements SchedulingStrategy { /* ... */ }
class FSRSStrategy implements SchedulingStrategy { /* ... */ }

class ReviewService {
  constructor(private strategy: SchedulingStrategy) {}

  setStrategy(strategy: SchedulingStrategy) {
    this.strategy = strategy;
  }

  processReview(card: Card, rating: Rating, now: Date) {
    return this.strategy.calculateNextReview(card, rating, now);
  }
}
```

### Review Queue Management

**Priority Queue Pattern:**
```typescript
class ReviewQueue {
  private priorityQueue: PriorityQueue<Card>;

  constructor() {
    this.priorityQueue = new PriorityQueue<Card>((a, b) => {
      // Priority: Learning > Review > New
      const priorityScore = (card: Card) => {
        if (card.state === 'learning') return 1000;
        if (card.state === 'relearning') return 900;
        if (card.state === 'review') return 500;
        return 100; // new
      };
      return priorityScore(b) - priorityScore(a);
    });
  }

  enqueue(card: Card) {
    this.priorityQueue.enqueue(card);
  }

  dequeue(): Card | null {
    return this.priorityQueue.dequeue();
  }

  size(): number {
    return this.priorityQueue.size();
  }
}
```

**Time-based Filtering:**
```typescript
async function getDueCards(deckId: string, now: Date): Promise<Card[]> {
  return cardRepository.find({
    deckId,
    $or: [
      { state: 'learning', due: { $lte: now } },
      { state: 'relearning', due: { $lte: now } },
      { state: 'review', due: { $lte: now } },
      { state: 'new', due: { $lte: getNextNewCardPosition() } },
    ],
  });
}
```

### State Persistence Patterns

**Database Schema Design (SQLite):**
```sql
-- Core card table
CREATE TABLE cards (
    id INTEGER PRIMARY KEY,
    note_id INTEGER NOT NULL,
    deck_id INTEGER NOT NULL,

    -- Scheduling state
    state INTEGER NOT NULL,           -- 0=new, 1=learning, 2=review, 3=relearning
    queue INTEGER NOT NULL,           -- scheduling queue
    due INTEGER NOT NULL,            -- due date (epoch seconds or days)
    ivl INTEGER NOT NULL,            -- interval in days

    -- Algorithm-specific fields
    factor INTEGER NOT NULL,          -- ease factor (permille)
    stability REAL,                   -- FSRS stability
    difficulty REAL,                  -- FSRS difficulty (1-10)

    -- Statistics
    reps INTEGER NOT NULL,             -- total reviews
    lapses INTEGER NOT NULL,           -- times forgotten

    -- Metadata
    mod INTEGER NOT NULL,             -- modification time
    usn INTEGER NOT NULL,            -- update sequence number

    FOREIGN KEY (note_id) REFERENCES notes(id),
    FOREIGN KEY (deck_id) REFERENCES decks(id)
);

-- Review log for analysis and optimization
CREATE TABLE revlog (
    id INTEGER PRIMARY KEY,
    cid INTEGER NOT NULL,            -- card id
    usn INTEGER NOT NULL,
    ease INTEGER NOT NULL,           -- rating
    ivl INTEGER NOT NULL,           -- interval used
    last_ivl INTEGER NOT NULL,       -- previous interval
    factor INTEGER NOT NULL,          -- ease factor used
    time INTEGER NOT NULL,            -- time taken (ms)
    type INTEGER NOT NULL,            -- review type

    FOREIGN KEY (cid) REFERENCES cards(id)
);

-- Performance indexes
CREATE INDEX idx_cards_due ON cards(deck_id, queue, due);
CREATE INDEX idx_cards_note ON cards(note_id);
CREATE INDEX idx_revlog_card ON revlog(cid);
CREATE INDEX idx_revlog_time ON revlog(id);
```

**File-based Storage Pattern (Emerging):**
```typescript
// Markdown-based card storage (Hashcards-style)
interface MarkdownDeck {
  filename: string;
  cards: MarkdownCard[];
}

interface MarkdownCard {
  type: 'qa' | 'cloze';
  front: string;
  back?: string;
  tags: string[];
  metadata: {
    created: Date;
    modified: Date;
    state: 'new' | 'learning' | 'review';
    due: Date;
  };
}

// Parse markdown file
function parseMarkdownDeck(content: string): MarkdownDeck {
  const lines = content.split('\n');
  const cards: MarkdownCard[] = [];

  for (const line of lines) {
    if (line.startsWith('Q:')) {
      // Q: What is X? -> A: Y
      const front = line.substring(2).trim();
      // Parse subsequent lines...
    } else if (line.startsWith('C:')) {
      // Cloze: C: The [capital] of France is Paris.
      // Parse cloze pattern...
    }
  }

  return { filename, cards };
}
```

**JSON-based Storage:**
```typescript
interface CollectionJSON {
  version: number;
  decks: Record<string, DeckJSON>;
  cards: CardJSON[];
  notes: NoteJSON[];
  reviewLogs: ReviewLogJSON[];
}

// Atomic save
async function saveCollection(collection: CollectionJSON, path: string) {
  const tempPath = `${path}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(collection, null, 2));

  // Atomic rename
  await fs.rename(tempPath, path);
}
```

### Performance Optimization Techniques

**Batch Processing:**
```typescript
// Process reviews in batches
async function batchProcessReviews(reviews: Review[], batchSize: number = 100) {
  for (let i = 0; i < reviews.length; i += batchSize) {
    const batch = reviews.slice(i, i + batchSize);

    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      for (const review of batch) {
        await updateCardState(tx, review.cardId, review.rating);
        await logReview(tx, review);
      }
    });

    // Yield to event loop
    await new Promise(resolve => setImmediate(resolve));
  }
}
```

**Lazy Loading:**
```typescript
class DeckLoader {
  private cache = new Map<string, Deck>();

  async getDeck(deckId: string): Promise<Deck> {
    if (this.cache.has(deckId)) {
      return this.cache.get(deckId)!;
    }

    const deck = await this.loadDeck(deckId);
    this.cache.set(deckId, deck);
    return deck;
  }

  private async loadDeck(deckId: string): Promise<Deck> {
    // Lazy load cards only when accessed
    return {
      id: deckId,
      name: await this.getDeckName(deckId),
      cards: new LazyCardLoader(deckId),
    };
  }
}
```

**Database Query Optimization:**
```sql
-- Use prepared statements with parameters
PREPARE get_due_cards AS
  SELECT * FROM cards
  WHERE deck_id = ? AND queue IN (1, 2) AND due <= ?
  ORDER BY due ASC
  LIMIT ?;

-- Create appropriate indexes
CREATE INDEX idx_cards_deck_queue_due ON cards(deck_id, queue, due);

-- Use EXPLAIN QUERY PLAN to analyze
EXPLAIN QUERY PLAN SELECT * FROM cards WHERE deck_id = 1 AND due <= 123456;
```

**In-memory Caching:**
```typescript
class CardCache {
  private cache = new LRUCache<string, Card>(1000);

  get(cardId: string): Card | undefined {
    return this.cache.get(cardId);
  }

  set(card: Card) {
    this.cache.set(card.id, card);
  }

  invalidate(deckId: string) {
    // Remove all cards for a deck
    for (const [id, card] of this.cache.entries()) {
      if (card.deckId === deckId) {
        this.cache.delete(id);
      }
    }
  }
}
```

**Parallel Processing (for large collections):**
```typescript
// Worker pool for card processing
class CardProcessor {
  private workers: Worker[];
  private queue: any[] = [];

  constructor(concurrency: number = 4) {
    this.workers = Array(concurrency).fill(null).map(() =>
      new Worker('./card-worker.js')
    );
  }

  async processCards(cards: Card[]): Promise<ProcessedCard[]> {
    const chunks = this.chunkArray(cards, this.workers.length);

    const results = await Promise.all(
      chunks.map((chunk, i) =>
        this.processWithWorker(this.workers[i], chunk)
      )
    );

    return results.flat();
  }

  private async processWithWorker(worker: Worker, cards: Card[]) {
    return new Promise((resolve) => {
      worker.on('message', resolve);
      worker.postMessage({ type: 'process', cards });
    });
  }
}
```

### Sync and Cloud Storage Patterns

**CRDT-based Sync (Conflict-Free Replicated Data Types):**
```typescript
interface CardOperation {
  type: 'create' | 'update' | 'delete';
  cardId: string;
  timestamp: number;
  deviceId: string;
  data: any;
}

// Sync operations using causal ordering
async function syncOperations(localOps: CardOperation[], remoteOps: CardOperation[]) {
  // Merge by timestamp, breaking ties with deviceId
  const mergedOps = [...localOps, ...remoteOps].sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    return a.deviceId.localeCompare(b.deviceId);
  });

  // Apply operations in order
  for (const op of mergedOps) {
    await applyOperation(op);
  }
}
```

**Delta Sync (Only transfer changes):**
```typescript
async function syncChanges(lastSync: Date) {
  const changes = await getChangesSince(lastSync);

  // Send only changed cards
  const payload = {
    cards: changes.map(c => ({
      id: c.id,
      modified: c.modified,
      due: c.due,
      state: c.state,
      // Only send changed fields
    })),
    timestamp: new Date(),
  };

  const remoteChanges = await uploadAndFetch(payload);

  await mergeChanges(remoteChanges);
}
```

### Analytics and Optimization

**Review Log Analysis:**
```typescript
async function analyzePerformance(userId: string, days: number = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const logs = await getReviewLogs(userId, cutoff);

  const stats = {
    totalReviews: logs.length,
    accuracy: calculateAccuracy(logs),
    averageTime: logs.reduce((sum, l) => sum + l.timeTaken, 0) / logs.length,
    difficultyDistribution: calculateDifficultyDistribution(logs),
    retentionRate: calculateRetentionRate(logs, cutoff),
  };

  return stats;
}

function calculateRetentionRate(logs: ReviewLog[], since: Date): number {
  const correctReviews = logs.filter(l => l.rating >= 3).length;
  return correctReviews / logs.length;
}
```

**Parameter Optimization (FSRS):**
```python
# Using fsrs-optimizer for personalized parameters
from fsrs_optimizer import FSRSOptimizer

optimizer = FSRSOptimizer()

# Load your review logs
review_logs = load_review_logs('my_collection.anki2')

# Train parameters
best_params = optimizer.optimize(review_logs)

# Save for use in scheduler
save_parameters('params.json', best_params)

# Use optimized parameters
fsrs = FSRS(parameters=best_params)
```

## Emerging Trends

1. **AI-Enhanced SRS**: Integration with language models for automatic card generation and difficulty estimation

2. **File-First Systems**: Moving away from databases to plain text/markdown files for better version control and portability

3. **Cross-Platform Mobile**: Flutter and React Native implementations with shared core logic

4. **WebAssembly**: Running algorithms in browser for performance and offline capabilities

5. **Real-time Collaboration**: Multi-user study sessions with shared card pools

6. **Privacy-First**: Local-only processing with optional encrypted cloud backup

7. **Progressive Web Apps**: Offline-capable web implementations using Service Workers

8. **Gamification**: Enhanced engagement through streaks, achievements, and leaderboards

## Key Takeaways

1. **FSRS is the recommended modern algorithm** for new implementations, with SM-2 as a simpler alternative

2. **Separate the scheduling algorithm** from data persistence and presentation for maintainability

3. **Use appropriate storage** based on scale: SQLite for desktop, JSON files for simplicity, cloud databases for sync

4. **Index strategically** on (deck_id, queue, due) for performance

5. **Log all reviews** for analytics and algorithm optimization

6. **Consider offline-first** architecture with sync as an add-on feature

7. **Test algorithms independently** with unit tests before integration

8. **Use type-safe languages** (TypeScript, Rust, Go) for complex scheduling logic

9. **Plan for migration paths** between algorithms as research continues

10. **Optimize for user experience** by prioritizing learning cards and providing flexible scheduling
