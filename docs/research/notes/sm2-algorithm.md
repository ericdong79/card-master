# SM-2 Algorithm Implementation

## Summary

The SM-2 (SuperMemo 2) algorithm, first implemented in December 1987, is the foundational spaced repetition algorithm used by Anki. It tracks three core properties for each card: repetition count (n), easiness factor (EF), and inter-repetition interval (I). The algorithm dynamically adjusts review intervals based on user performance, using the ease factor to differentiate between items of varying difficulty. Anki's implementation modifies the original SM-2 in several key ways, including configurable learning steps, four-button review choices (Again, Hard, Good, Easy) instead of six, factoring in lateness for early/late reviews, and avoiding "ease hell" by not decreasing ease factors during the learning phase.

The algorithm's core premise is that subsequent intervals increase by an approximately constant factor (the ease factor). Items start with an ease factor of 2.5 (250%), which is modified after each review based on the quality of response. Failed responses reset the repetition count to zero, requiring relearning from the beginning, while successful responses increment the count and calculate the next interval. Anki adds several refinements including fuzz factor randomization to prevent card clustering, easy bonus for aggressive scheduling on perfect recall, and configurable parameters like interval modifier, hard interval, and maximum interval.

## Key Findings

### Algorithm Formula and Variables

**Original SM-2 Algorithm (from SuperMemo):**

```
Initial EF = 2.5 (for all new items)
Minimum EF = 1.3

Interval Calculation:
I(1) = 1 day
I(2) = 6 days
I(n) = I(n-1) × EF (for n > 2, rounded up to nearest integer)

EF Update Formula:
EF' = EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02))
```

Where:
- I(n) = inter-repetition interval after n-th repetition (in days)
- EF = easiness factor reflecting item memorability (range: 1.3 to 2.5 in original SM-2)
- q = quality of response (0-5 grade scale)
- EF' = new ease factor

**Simplified EF formula (equivalent):**
```
EF' = EF - 0.8 + 0.28q - 0.02q²
```

Note: For q=4, the ease factor remains unchanged.

### How Each Review Rating Affects Scheduling

**Anki's Four-Button System (for graduated/review cards):**

| Button | Effect on Interval | Effect on Ease Factor |
|--------|-------------------|----------------------|
| **Again** | Resets interval, card enters relearning | Decreases by 20 percentage points |
| **Hard** | Interval × 1.2 (hard interval) × interval modifier | Decreases by 15 percentage points |
| **Good** | Interval × ease factor × interval modifier | No change |
| **Easy** | Interval × ease factor × easy bonus (1.3) × interval modifier | Increases by 15 percentage points |

**Original SM-2 Quality Scale (0-5):**
- 0 = Complete blackout
- 1 = Incorrect response; the correct one remembered
- 2 = Incorrect response; the correct one seemed easy to recall
- 3 = Correct response recalled with serious difficulty
- 4 = Correct response after hesitation
- 5 = Perfect response

**Anki Mapping (approximately):**
- Again ≈ q < 3 (failure)
- Hard ≈ q = 3
- Good ≈ q = 4
- Easy ≈ q = 5

**Constraint:** New intervals (except Again) are always at least one day longer than the previous interval.

### Initial Interval Settings for New Cards

**Learning Phase (before graduation):**

```
Learning Steps: Configurable, typically in minutes
- Example: 1 min, 10 min, 1 day

Button effects during learning:
- Again: Reset to first step (e.g., 1 min)
- Good: Advance to next step; if final step, graduate
- Easy: Immediately graduate with "Easy Interval"
```

**Graduation (when learning completes):**
```
Graduating Interval: 1 day (when pressing Good)
Easy Interval: 4 days (when pressing Easy)
Starting Ease: 250% (default, can be configured)
```

**Key Difference from Standard SM-2:**
- Standard SM-2 uses fixed initial intervals (1 day, 6 days)
- Anki allows configurable learning steps in minutes before graduation
- Successive failures during learning do NOT decrease ease factor in Anki (avoids "ease hell")

### Graduation Logic (Learning to Graduated Cards)

**Learning Phase:**
1. Card starts in "learning" status with steps_index = 0
2. Each "Good" advances through learning steps
3. Each "Again" resets to first step (steps_index = 0)
4. When final learning step is completed with "Good":
   - Status changes to "learned" (graduated)
   - Interval set to graduating interval (default: 1 day)
   - Card enters review phase

**Alternative Graduation (Easy button):**
- Pressing "Easy" at any point immediately graduates the card
- Sets interval to easy interval (default: 4 days)

**Relearning Phase (after lapsing):**
- Failed review cards enter "relearning" status
- Use lapse steps (typically in minutes, e.g., 10 min)
- Interval already reduced when entering relearning
- Graduation returns to pre-lapse interval

### Leech Card Detection and Handling

**Leech Threshold (Anki):**
- Default: 8 lapses
- A card becomes a leech when it reaches the lap threshold
- Subsequent leech flags occur at 12, 16, 20 lapses (½ threshold intervals)

**Leech Characteristics:**
- Ease factor typically close to 130% (minimum)
- Indicates problematic card formulation

**Leech Actions (configurable):**
- Suspend card (default)
- Tag card as leech
- Show leech notification
- No action (ignore)

**Purpose:**
- Identifies inherently problematic items
- Encourages card reformulation
- Prevents wasting time on persistently difficult cards

### Important Parameters and Their Typical Values

**Core Algorithm Parameters:**
```
Starting Ease: 250% (range: 130%-250%+)
Minimum Ease: 130%
Initial Interval (after 1st success): 1 day
Second Interval (after 2nd success): 6 days
```

**Anki-Specific Parameters:**
```
Learning Steps: [1, 10] minutes (configurable)
Graduating Interval: 1 day
Easy Interval: 4 days

Review Phase:
Easy Bonus: 130% (multiplier for Easy button)
Hard Interval: 120% (multiplier for Hard button)
Interval Modifier: 100% (applied to all reviews)
Maximum Interval: 36500 days (~100 years)

Lapse Phase:
Lapse Steps: [10] minutes
New Interval: 70% (interval reduction after failure)
Minimum Interval: 1 day
```

**Fuzz Factor Calculation (Anki V2 Scheduler):**
```
For interval ivl:
- If ivl < 2: no fuzz (returns 1)
- If ivl == 2: fuzz range (2, 3)
- If ivl < 7: fuzz = int(ivl × 0.25)
- If ivl < 30: fuzz = max(2, int(ivl × 0.15))
- If ivl >= 30: fuzz = max(4, int(ivl × 0.05))

Final interval = random(ivl - fuzz, ivl + fuzz)
```

**Purpose of Fuzz:**
- Prevents cards added on same day with same history from clustering
- Adds 0-5 minutes variance for learning cards
- Averages out over many reviews (randomly increases and decreases intervals equally)

## Sources

1. https://super-memory.com/english/ol/sm2.htm - Original SM-2 algorithm documentation by Piotr Wozniak (1990), including formulas for interval calculation, ease factor modification, and quality assessment scale

2. https://docs.ankiweb.net/background.html - Anki manual background section explaining that Anki's system is based on SM-2 and introducing the new FSRS alternative

3. https://faqs.ankiweb.net/what-spaced-repetition-algorithm - Detailed comparison of Anki's SM-2 implementation vs. standard SM-2, including four-button system, learning steps, lateness factoring, and ease hell prevention

4. https://supermemo.guru/wiki/Algorithm_SM-2 - Historical context noting SM-2 was first used in SuperMemo 1.0 on December 13, 1987, with slight improvements in SuperMemo 2.0 (1991)

5. https://borretti.me/article/implementing-sm2-in-rust - Clear mathematical explanation of SM-2 with closed-form expression I(n) = 6 × EF^(n-2) and EF update function f(q) = -0.8 + 0.28q - 0.02q²

6. https://gist.github.com/riceissa/1ead1b9881ffbb48793565ce69d7dbdd - Python implementation of Anki's algorithm showing learning/relearning phase logic and rating effects on intervals and ease

7. https://docs.ankiweb.net/deck-options.html - Anki documentation for deck options including Hard Interval, Easy Bonus, and Interval Modifier parameters

8. https://github.com/ankitects/anki/issues/1416 - GitHub issue detailing fuzz factor calculation formula for V2 scheduler and constraints for short intervals

9. https://en.wikipedia.org/wiki/SuperMemo - Wikipedia overview confirming SM-2 was first computer-based algorithm released in 1987, used in SuperMemo versions 1.0-3.0

10. https://stackoverflow.com/questions/49047159/spaced-repetition-algorithm-from-supermemo-sm-2 - StackOverflow question with clear implementation example showing SM-2 parameters, interval calculation rules, and ease factor constraints

11. https://github.com/open-spaced-repetition/anki-sm-2 - Python package implementing Anki's legacy SM-2-based algorithm with examples of Rating levels (Again, Hard, Good, Easy)

## Notable Quotes

> "The SM-2 algorithm was the first computer algorithm for computing the optimum schedule in spaced repetition. It was first used in SuperMemo 1.0 for DOS on Dec 13, 1987." - supermemo.guru

> "If interval is a fraction, round it up to the nearest integer." - Piotr Wozniak, SuperMemo documentation (1990)

> "E-Factors were allowed to vary between 1.1 for the most difficult items and 2.5 for the easiest ones. Items having E-Factors lower than 1.3 were repeated annoyingly often and always seemed to have inherent flaws in their formulation." - Piotr Wozniak, SuperMemo documentation (1990)

> "Note, that for q=4 the E-Factor does not change." - Piotr Wozniak, SuperMemo documentation (1990)

> "Anki understands that it can be necessary to see a new card a number of times before you're able to memorize it, and those initial 'failures' don't mean you need to be punished by being shown the failed card many times over the course of a few days. Performance during the learning stage does not reflect performance in the retaining stage." - Anki FAQ

> "Successive failures while cards are in learning do not result in further decreases to the card's ease. A common complaint with the standard SM-2 algorithm is that repeated failings of a card cause the card to get stuck in 'low interval hell'. In Anki, the initial acquisition process does not influence a card's ease." - Anki FAQ

> "Answering cards later than scheduled will be factored into the next interval calculation, so you receive a boost to cards that you were late in answering but still remembered." - Anki FAQ

> "The closed-form expression is: I(n) = 6 × EF^(n-2)" - Fernando Borretti, "Implementing SM-2 in Rust"

> "So for anything less than perfect recall the EF decreases (and so the next interval is shorter), and only perfect recall makes a card less difficult. At q=4 nothing changes. And so we get ease hell: it is much easier to push EF down, or keep it the same, than to push it up." - Fernando Borretti, "Implementing SM-2 in Rust"

> "Eases will never be decreased below 130%; SuperMemo's research has shown that eases below 130% tend to result in cards becoming due more often than is useful and annoying users." - Anki FAQ

> "Anki introduces a fuzz factor that makes intervals randomly larger or shorter. But given a large number of reviews, that should average out to nothing as it makes intervals both larger and shorter with equal probability." - Eric Shapard

## Implementation Notes

### Critical Implementation Details

**Ease Factor Constraint:**
- Always enforce minimum EF of 1.3 (130%)
- This prevents "interval hell" where difficult cards become impossible to retain
- Items below this threshold likely need reformulation

**Quality/Response Mapping:**
- Map 4-button Anki system to 6-grade SM-2 scale
- Remember that q=4 (Good) leaves EF unchanged in original SM-2
- Anki's modifications: Good increases interval but not ease; Easy increases both

**Interval Calculation Order:**
1. Calculate base interval from ease factor and previous interval
2. Apply modifiers (hard interval, easy bonus, interval modifier)
3. Apply fuzz factor (random variance)
4. Constrain to maximum interval
5. Ensure minimum of previous interval + 1 (for Hard/Good/Easy)

**Learning vs. Review Phase:**
- New cards have NO ease factor until graduation
- Repeated "Again" during learning doesn't affect future ease
- Only after graduation does ease factor come into play
- This is crucial for preventing ease hell

**Lateness Handling:**
- Anki factors in days elapsed since due date for early/late reviews
- Provides bonus for late reviews still answered correctly
- Not present in original SM-2 algorithm

**Fuzz Factor Timing:**
- Apply fuzz AFTER all other calculations
- Apply BEFORE maximum interval constraint (important for short intervals)
- Use deterministic seed for testability if implementing

### Common Pitfalls

**1. Ease Factor Range Violations:**
- Error: Allowing EF to drop below 1.3
- Fix: Always clamp EF to minimum of 1.3 after update

**2. Incorrect Interval Order:**
- Error: Applying modifiers in wrong order
- Fix: Base → Modifiers → Fuzz → Maximum constraint

**3. Learning Phase Mistakes:**
- Error: Decreasing ease during learning phase
- Fix: Only modify ease after graduation; learning phase uses steps only

**4. Fuzz Overriding Minimums:**
- Error: Fuzz forcing interval below previous + 1
- Fix: Constrain final interval to be at least previous + 1 after fuzzing

**5. Fractional Days:**
- Error: Using fractional intervals
- Fix: Always round up to nearest integer (ceiling operation)

**6. Reset Behavior:**
- Error: Resetting ease on "Again"
- Fix: Only reset repetition count; modify ease by -20 percentage points, don't reset to 2.5

**7. Missing Minimum Interval:**
- Error: Allowing zero or negative intervals
- Fix: Always ensure minimum interval of 1 day (except for learning steps in minutes)

### Simplification Opportunities for Minimal Implementation

**Phase 1: Core SM-2 (Minimum Viable):**
- Implement basic interval calculation: I(n) = I(n-1) × EF
- Implement EF update formula
- Handle failure reset (n → 0)
- Skip fuzz factor (adds complexity, not critical for core logic)
- Skip lateness factoring
- Single learning step (1 day)
- No relearning phase (immediate reset to 1 day on failure)

**Phase 2: Add Learning Phase:**
- Implement configurable learning steps in minutes
- Add graduation logic (learning → review)
- Preserve ease during learning (prevent ease hell)

**Phase 3: Add Anki Enhancements:**
- Add four-button rating system (Again, Hard, Good, Easy)
- Implement easy bonus (1.3x multiplier)
- Implement hard interval (1.2x multiplier)
- Add interval modifier (global multiplier)
- Add ease adjustment: Hard (-15%), Again (-20%), Easy (+15%)

**Phase 4: Advanced Features:**
- Implement fuzz factor for card decorrelation
- Add lateness factoring for early/late reviews
- Add relearning phase (separate from learning)
- Implement leech detection
- Add maximum interval constraint
- Add minimum interval constraint (previous + 1)

**Recommended Default Values for Simplified Implementation:**
```
Starting EF: 2.5
Minimum EF: 1.3
Initial Interval: 1 day
Second Interval: 6 days
Learning Steps: [1, 10, 1440] (1 min, 10 min, 1 day)
Graduating Interval: 1 day
Easy Interval: 4 days
Easy Bonus: 1.3
Hard Interval: 1.2
Interval Modifier: 1.0
Maximum Interval: 36500
```

## Gaps and Conflicts

**1. Fuzz Factor Variance vs. Deterministic Testing:**
- Conflict: Random fuzz factor makes testing difficult and introduces non-deterministic behavior
- Resolution: Use seeded random number generator for testing; optional fuzz for production
- Status: V2 uses random fuzz; V3 proposed deterministic fuzz (single factor 0-1 applied to range)

**2. Early/Late Review Handling:**
- Gap: Exact formula for lateness factor not clearly documented in official sources
- Resolution: Forums mention "additional days will be added" based on elapsed time vs. scheduled
- Status: Needs more research into Anki source code or explicit documentation

**3. Constraint Ordering:**
- Conflict: GitHub issue #3015 notes maximum interval applied AFTER fuzz, causing issues with short intervals
- Resolution: Apply maximum interval BEFORE fuzz for better behavior
- Status: Bug identified in V2 scheduler; may be fixed in V3

**4. Hard Interval Greater Than Good:**
- Conflict: Forum reports Hard interval sometimes shows longer than Good due to rounding
- Resolution: This is by design (1.2x multiplier), but can be confusing
- Status: Documented behavior, not a bug

**5. EF Update Formula Simplification:**
- Conflict: Two equivalent EF formulas presented (additive vs. quadratic form)
- Resolution: Both produce identical results; quadratic form (-0.8 + 0.28q - 0.02q²) is simpler for implementation
- Status: Resolved; use quadratic form

**6. Learning Steps vs. Intervals:**
- Gap: Transition point from learning steps (minutes) to review intervals (days)
- Resolution: Graduation after completing final learning step with "Good" response
- Status: Well-documented in implementation examples

**7. Successive Learning Failures and EF:**
- Conflict: Original SM-2 resets on q < 3; Anki preserves EF during learning phase
- Resolution: Anki's approach is intentional modification to prevent ease hell
- Status: Documented Anki improvement over SM-2

**8. Fuzz for Short Intervals:**
- Conflict: V2 scheduler fuzz overridden by constraints for intervals ≤ 4 days
- Resolution: Proposed V3 improvement with deterministic fuzz
- Status: Issue identified in V2, fix pending in V3

**9. Closed-Form vs. Recurrent Interval Calculation:**
- Gap: Sources show both I(n) = I(n-1) × EF (recurrent) and I(n) = 6 × EF^(n-2) (closed-form)
- Resolution: Closed-form is mathematically equivalent and more efficient for n ≥ 3
- Status: Resolved; use closed-form when possible for efficiency

**10. Original SM-2 EF Range vs. Anki:**
- Conflict: Original SM-2 EF range is 1.1-2.5 with minimum 1.3; Anki allows EF to increase above 2.5
- Resolution: Anki extended EF upper limit (no maximum) but maintains 1.3 minimum
- Status: Documented Anki modification