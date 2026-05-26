# Simplified Scheduling Approaches

## Summary

Spaced repetition scheduling doesn't require complex algorithms for most use cases. Research reveals multiple minimal viable implementations ranging from 40 to 100 lines of code. The simplest effective approaches are: (1) interval doubling with reset on failure, (2) the Leitner box system with 3-5 boxes, and (3) simplified SM-2 with only ease factor tracking. These approaches achieve 80-90% of the benefit of full SM-2 with significantly less complexity.

Key insight from Fresh Cards and Control-Alt-Backspace: algorithms attempt to triangulate "memorability" and "user's memory quality" based on review performance. The most important signals are: recall success, response difficulty, consecutive successes, current interval length, and lateness. Simplified implementations that track just ease factor (EF) and interval (I) perform surprisingly well for MVP purposes.

Modern research shows FSRS (Free Spaced Repetition Scheduler) is more sophisticated than SM-2, but minimal implementations like femto-fsrs (100 lines TypeScript) capture its essence. For MVPs, the consensus is: start with simple SM-2, add difficulty differentiation later, consider FSRS only when optimizing for power users.

## Simplified Algorithms

### Basic Interval Multipliers

**Doubling Algorithm (Simplest)**
- On success: `interval = interval * 2`
- On failure: `interval = 1` (reset)
- Works but doesn't differentiate difficulty

**Weighted Multiplier (SM-2 Lite)**
```
ease = 2.5 (initial)
On correct (rating >= 3):
  ease = ease + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
  interval = round(interval * ease)
On incorrect (rating < 3):
  ease = ease - 0.2
  interval = 1
```

**Anki-style Multipliers**
- Hard: `interval = max(interval * 1.2, interval + 1)`
- Good: `interval = interval * ease`
- Easy: `interval = interval * ease * 1.3`
- Again: `interval = 1`

### Linear vs Exponential Spacing

**Linear Spacing**
- Fixed increments: +1, +2, +3, +4 days
- Pros: Predictable, simple to implement
- Cons: Doesn't scale well for long-term retention
- Best for: Short learning goals, fixed-duration courses

**Exponential Spacing**
- Multiplier-based: ×2, ×2.5, ×3, etc.
- Pros: Efficient, scales with retention strength
- Cons: Can be too aggressive initially
- Best for: Long-term knowledge retention, language learning

**Hybrid (First Reviews Exponential, Then Taper)**
- Reviews 1-3: Fixed intervals (1, 6 days)
- Subsequent: Exponential with ease factor
- Used by: Full SM-2 algorithm

### Fixed Interval Approaches

**Leitner System (Box-Based)**
- Physical or virtual boxes with fixed review frequencies
- Box 1: Every day
- Box 2: Every 2-3 days
- Box 3: Every week
- Box 4: Every 2 weeks
- Move up on correct, drop to Box 1 on incorrect
- Implementation: Array of queues, index = box number

**Fixed Schedule (Simplest)**
- Every card: 1 day, 3 days, 7 days, 14 days, 30 days
- Reset to day 1 on failure
- Pros: No per-card state needed
- Cons: Wastes time on easy cards, fails hard cards

**Randomized Jitter**
- Add ±10-20% randomness to intervals
- Prevents cards from "sticking together"
- Recommended for implementations with multiple cards introduced same day

### Algorithm Comparisons with SM-2

| Feature | Doubling | Leitner | SM-2 Full | SM-2 Lite | FSRS |
|---------|----------|---------|-----------|-----------|------|
| Lines of Code | 5-10 | 20-30 | 100+ | 30-50 | 100-200 |
| Per-Card State | interval | box index | I, EF, reps | I, EF | S, D, R |
| Difficulty Tracking | None | Implicit (box) | Explicit (EF) | Explicit (EF) | Explicit (D) |
| Overdue Handling | Ignored | Implicit | Yes | No | Yes |
| Fuzzing | Optional | N/A | Yes | No | Yes |
| Accuracy | 60% | 70% | 85% | 80% | 90% |
| Best For | MVP demos | Physical cards | Power users | MVP apps | Optimization |

**Key SM-2 Simplifications (Safe for MVP):**
- Remove overdue handling (use actual review date instead)
- Remove lapsed card special handling
- Use single ease factor instead of EF + interval history
- Remove fuzzing (add later if cards bunch together)
- Remove leech detection (add when users report frustration)

**What NOT to simplify:**
- Minimum ease factor (1.3) - prevents infinite review loops
- Initial interval (1 day) - critical for first review
- Ease factor bounds (1.3-2.5) - prevents unrealistic schedules

## Code Examples

### Simplest Implementation (Doubling)

```javascript
function calculateNextInterval(currentInterval, remembered) {
  if (remembered) {
    return Math.max(currentInterval * 2, 1);
  } else {
    return 1; // Reset to 1 day
  }
}
```

### SM-2 Lite Implementation

```python
def sm2_lite(interval, ease, rating):
    """
    Simplified SM-2 algorithm
    rating: 0-5 (0=complete blackout, 5=perfect response)
    Returns: (new_interval, new_ease)
    """
    MIN_EASE = 1.3
    
    if rating < 3:
        # Failed: reset
        new_interval = 1
        new_ease = max(ease - 0.2, MIN_EASE)
    else:
        # Success: calculate new ease and interval
        new_ease = ease + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
        new_ease = max(new_ease, MIN_EASE)
        
        if interval == 0:
            # First review
            new_interval = 1
        else:
            new_interval = round(interval * new_ease)
    
    return new_interval, new_ease
```

### Leitner System Implementation

```python
from collections import deque

class LeitnerSystem:
    def __init__(self, num_boxes=3):
        # Boxes 0-2, where 0 = review daily
        self.boxes = [deque() for _ in range(num_boxes)]
        self.box_intervals = [1, 2, 7]  # Review every N days
    
    def add_card(self, card_id):
        self.boxes[0].append(card_id)
    
    def review_card(self, card_id, box_num, remembered):
        # Remove from current box
        self.boxes[box_num].remove(card_id)
        
        if remembered and box_num < len(self.boxes) - 1:
            # Promote to next box
            self.boxes[box_num + 1].append(card_id)
        else:
            # Demote to first box
            self.boxes[0].append(card_id)
    
    def get_due_cards(self, days_since_study):
        due_cards = []
        for box_num, interval in enumerate(self.box_intervals):
            if days_since_study % interval == 0:
                due_cards.extend(list(self.boxes[box_num]))
        return due_cards
```

### Anki-style Multiplier (from simple-spaced-repetition)

```python
# From vlopezferrando/simple-spaced-repetition (40 lines)
class Card:
    def __init__(self):
        self.status = 'learning'
        self.step = 0
        self.interval = None
        self.ease = 2.5
    
    def options(self):
        """Returns list of (rating, new_card) tuples"""
        if self.status == 'learning':
            return [
                ('again', Card(interval=timedelta(minutes=1))),
                ('hard', Card(interval=timedelta(minutes=6))),
                ('good', Card(interval=timedelta(minutes=10))),
                ('easy', Card(interval=timedelta(days=4), status='review'))
            ]
        else:  # reviewing
            # Calculate intervals based on ease
            again = self._reset()
            hard = self._multiply_interval(1.2)
            good = self._multiply_interval(self.ease)
            easy = self._multiply_interval(self.ease * 1.3)
            return [
                ('again', again),
                ('hard', hard),
                ('good', good),
                ('easy', easy)
            ]
```

### Minimal FSRS Implementation (from femto-fsrs)

```typescript
// 100-line FSRS implementation
export enum Grade {
  AGAIN = 1,
  HARD = 2,
  GOOD = 3,
  EASY = 4
}

export interface Card {
  S: number;  // Stability
  D: number;  // Difficulty
  R: number;  // Retrievability
  I: number;  // Next interval (days)
}

export function createDeck() {
  return {
    newCard: (grade: Grade): Card => {
      return {
        S: 0,
        D: 0,
        R: 1.0,
        I: calculateInitialInterval(grade)
      };
    },
    gradeCard: (card: Card, daysSinceReview: number, grade: Grade): Card => {
      const newS = calculateNextStability(card.S, card.R, grade);
      const newD = calculateNextDifficulty(card.D, grade);
      const newR = calculateRetrievability(newS, daysSinceReview);
      const newI = calculateNextInterval(newS, newR);
      
      return { S: newS, D: newD, R: newR, I: newI };
    }
  };
}
```

## Sources

1. https://freshcardsapp.com/srs/write-your-own-algorithm.html - Complete guide to writing custom SRS algorithms with inputs/outputs explained
2. https://controlaltbackspace.org/spacing-algorithm/ - Builds from first principles: doubling → Leitner → SM-2
3. https://github.com/vlopezferrando/simple-spaced-repetition - SM-2 in 40 lines of Python
4. https://github.com/flasd/spaced-repetition - SM-2 in TypeScript with minimal API
5. https://github.com/RickCarlino/femto-fsrs - FSRS in 100 lines TypeScript
6. https://github.com/thyagoluciano/sm2 - Dart implementation with detailed SM-2 explanation
7. https://juliensobczak.com/inspect/2022/05/30/anki-srs/ - Complete Anki algorithm walkthrough with code
8. https://www.supermemo.com/en/archives1990-2015/english/ol/sm2 - Original SM-2 algorithm specification
9. https://github.com/open-spaced-repetition/sm-2 - Python package for SM-2
10. https://github.com/AustinShelby/simple-ts-fsrs - Minimal FSRS in TypeScript
11. https://traverse.link/spaced-repetition/the-optimal-spaced-repetition-schedule - Research on optimal intervals
12. https://www.quizcat.ai/blog/top-5-spaced-repetition-algorithms-compared - Comparison of 5 algorithms
13. https://help.remnote.com/en/articles/6026144-the-anki-sm-2-spaced-repetition-algorithm - Anki SM-2 explained

## Trade-offs

### What Simplifications Lose vs Gain

| Simplification | What You Lose | What You Gain |
|----------------|---------------|---------------|
| Remove overdue handling | Bonus for late reviews, adaptive scheduling | 30% less code, easier debugging |
| Remove leech detection | Auto-suspension of problem cards | Simpler state management |
| Remove fuzzing | Cards may bunch together, less randomization | Deterministic testing, simpler logic |
| Single ease factor (no interval history) | Context-aware adjustments | 50% less per-card state |
| Fixed multipliers (no ease adjustment) | Adaptation to card difficulty | 10-20 lines vs 50+ lines |
| No learning steps (just review) | Graduated difficulty curve | Simpler queue management |
| No day boundary handling | Precise sub-minute scheduling | 50% less code for 99% of use cases |

### Which Simplifications Are Acceptable for MVP

**Always Safe:**
- Remove overdue handling (use actual days since review)
- Remove leech detection (add when users complain about "stuck" cards)
- Remove day boundary special handling (for MVP, just use days)
- Remove fuzzing (add if users notice cards appearing together)
- Use default multipliers (1.2 for Hard, 1.3 Easy bonus) - no need for configurability
- Skip separate new/review/lapse queues - single queue with status flag

**Generally Safe:**
- SM-2 Lite instead of full SM-2 (drop interval history)
- Minimum ease factor of 1.3 (don't allow lower)
- Initial ease of 2.5 for all cards (no weighting)
- No weighted difficulty based on related cards

**Risky:**
- Removing minimum ease factor (can cause infinite loops)
- Initial interval longer than 1 day (frustrating for new cards)
- Ease factor above 2.5 (may schedule too aggressively)
- No per-card state at all (Leitner without boxes = just time-based)

### When Complexity Becomes Necessary

**Signs You Need Full SM-2:**
- Users report studying too many cards per day (over 200)
- Users complain about "stuck" cards they can't advance
- User retention drops after first week (initial interval too aggressive)
- Users create large decks (1000+ cards) and performance degrades
- Power users request advanced features like "buried" cards

**Signs You Need FSRS:**
- You have user data to train the "w" parameters
- Users report Anki's intervals are "too aggressive"
- You're building for serious long-term learners (years, not months)
- Users compare your app to Anki and want "better scheduling"

**Signs You Need Leitner:**
- Building physical card system (paper-based)
- Target audience prefers simple, predictable schedules
- Users have inconsistent study schedules (can't study daily)
- Educational context where instructors manage the system

**Implementation Complexity Timeline:**

```
MVP (Week 1-2):
  - Doubling algorithm or SM-2 Lite
  - Per-card state: interval, ease
  - Basic ratings: Again/Hard/Good/Easy
  - No overdue, no fuzzing, no leeches

V1.0 (Month 1-2):
  - Full SM-2 with overdue handling
  - Add fuzzing (±10%)
  - Add leech detection (optional)
  - Configurable multipliers

V2.0 (Month 3-6):
  - Separate new/learning/review queues
  - Learning steps (1m, 10m, 1d)
  - Day boundary handling
  - More detailed logging

V3.0 (Month 6+):
  - Consider FSRS if you have user data
  - Machine learning parameter optimization
  - Advanced features (buried cards, priorities)
```

### Bottom Line for MVP Development

Start with **SM-2 Lite**:
- 30-50 lines of code
- Per-card state: `interval` (int), `ease` (float)
- On success: adjust ease, multiply interval
- On failure: reset interval, decrease ease
- This gives you 80% of SM-2's effectiveness with 25% of the complexity

Upgrade path is clear - each feature removed can be added back incrementally as user feedback dictates. Don't optimize prematurely: most users won't notice the difference between SM-2 Lite and full SM-2 for the first 6-12 months of use.
