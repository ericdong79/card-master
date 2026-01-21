# FSRS vs SM-2 Algorithm Comparison

## Summary

FSRS (Free Spaced Repetition Scheduler) represents a significant advancement in spaced repetition technology, outperforming the 40-year-old SM-2 algorithm in 91.9-99% of cases depending on whether default or optimized parameters are used. The key innovation is FSRS's machine learning-based approach that automatically adapts to individual learning patterns, whereas SM-2 relies on static formulas with limited adaptability. Real-world benchmarks on 350 million reviews from 10,000 users demonstrate that FSRS achieves 20-30% reduction in daily study time while maintaining or improving retention rates compared to SM-2.

While SM-2 remains valuable due to its simplicity and ease of implementation, FSRS's three-component model (Difficulty, Stability, Retrievability) provides a more accurate framework for memory modeling. FSRS uses 21 trainable parameters and power function forgetting curves based on empirical data, whereas SM-2 uses fixed exponential intervals with a simple ease factor adjustment. The practical impact is substantial: users can maintain the same knowledge retention with significantly fewer review sessions, making FSRS particularly valuable for serious learners with large card collections.

## SM-2 Overview

### How It Works

SM-2 (SuperMemo 2), developed by Dr. Piotr Wozniak in 1985, uses a relatively simple exponential formula to calculate review intervals. The algorithm works as follows:
- Initial intervals typically follow a pattern: 1 day, then 6 days
- After successful reviews, intervals increase exponentially using a multiplier called the "ease factor" (default 2.5)
- Formula: `new_interval = previous_interval * ease_factor`
- The ease factor adjusts based on user ratings (Hard/Good/Easy), typically ranging from 1.3 to 2.5
- Failed reviews (Again) reset the card back to the initial interval

SM-2 tracks per-card variables:
- **Ease factor**: Represents how "easy" a card is to remember
- **Interval**: Days until next review
- **Repetitions**: Number of successful reviews

The algorithm assumes an exponential forgetting curve where memory decays at a constant rate over time, regardless of individual differences.

### Strengths

- **Simplicity**: Can be implemented in fewer than 100 lines of code
- **Proven track record**: Used successfully for 40+ years by millions of learners
- **Predictable behavior**: Deterministic scheduling with consistent patterns
- **Low computational overhead**: No complex calculations or parameter optimization required
- **Easy to understand**: Intuitive concept of increasing intervals as material becomes more familiar
- **Well-documented**: Extensive community resources and implementations available

### Weaknesses

- **Inflexible intervals**: Uses fixed exponential patterns that don't adapt to individual forgetting rates
- **One-size-fits-all**: Same formulas for all users, regardless of their memory characteristics
- **Manual calibration required**: Users must correctly rate difficulty, placing cognitive burden on learners
- **No personal difficulty modeling**: All cards use the same ease factor framework
- **Arbitrary formulas**: Initial intervals and multipliers were chosen heuristically, not empirically derived
- **Poor handling of overdue reviews**: Stability increases linearly with delay, which doesn't match real memory dynamics
- **"Ease hell" problem**: Cards can become excessively difficult to maintain if users rate them too harshly

### Complexity Level

**Low complexity** - suitable for MVP implementation. Requires only basic arithmetic operations and state management. Core implementation can be done in 50-100 lines of code in most programming languages. No machine learning, optimization, or complex data structures needed.

---

## FSRS Overview

### How It Works

FSRS is a machine learning-based algorithm that uses the DSR (Difficulty, Stability, Retrievability) model of memory. It was developed by Jarrett Ye and published in peer-reviewed papers at ACM KDD and IEEE TKDE. The algorithm works through three core components:

**1. Difficulty (D)**: A per-card metric (scaled 1-10) representing how inherently hard information is to recall. Unlike SM-2's global ease factor, FSRS calculates difficulty separately for each card based on review history.

**2. Stability (S)**: The number of days required for recall probability to decline from 100% to 90%. Stability represents how firmly information is encoded in long-term memory.

**3. Retrievability (R)**: The current probability of recall at any given moment. This changes daily based on time elapsed since the last review.

The algorithm uses 21 trainable parameters (in FSRS-6) and applies a power function forgetting curve rather than exponential:
```
R(t,S) = (1 + factor * t/S)^(-w20)
```
where R is retrievability, t is time elapsed, and S is stability.

FSRS automatically optimizes its parameters using machine learning techniques (maximum likelihood estimation and stochastic gradient descent) on a user's review history. The optimization process:
- Analyzes hundreds or thousands of past reviews
- Fits the 21 parameters to the user's specific memory patterns
- Continues to adapt as more data is collected

Users set a desired retention rate (typically 80-90%), and FSRS calculates optimal intervals to achieve that target while minimizing total review time.

### Strengths

- **Personalized scheduling**: Automatically adapts to individual memory patterns and forgetting rates
- **Data-driven**: Parameters are optimized from actual performance, not heuristics
- **Superior accuracy**: Outperforms SM-2 in 99% of cases when optimized for individual users
- **Reduced study time**: Achieves 20-30% reduction in daily reviews while maintaining retention
- **Better forgettling curve**: Uses power functions that better fit empirical data than exponential curves
- **No manual calibration**: Removes cognitive load of rating ease for every card
- **Handles overdue reviews gracefully**: Stability converges to an upper limit rather than increasing indefinitely
- **Per-card difficulty**: Recognizes that different concepts have inherent difficulty differences

### Weaknesses

- **Complexity**: Requires 21 parameters and optimization algorithms
- **Initial learning curve**: Needs more data to perform optimally (though works well from the start)
- **Computational overhead**: Requires running optimization to personalize parameters
- **Less intuitive**: Harder to explain to users than simple "multiply interval by ease factor"
- **Implementation complexity**: Full implementation is more involved than SM-2
- **Still evolving**: Algorithm continues to be refined (v1 through v6)

### Complexity Level

**Medium-high complexity** - suitable for production systems but requires more development effort than SM-2. Implementation involves:
- 21 parameter model with optimization algorithms
- Mathematical functions (power curves, logarithms, exponentials)
- Parameter optimization using gradient descent or similar methods
- State tracking for Difficulty, Stability, and Retrievability
- Can be implemented in ~100 lines of code but optimization adds complexity

Simplified implementations exist in 100 lines (e.g., femto-fsrs in TypeScript), but full feature-rich implementations require more work.

---

## Performance Comparison

### Retention Rates

**FSRS Benchmark Results** (from 350 million reviews, 10,000 users):

- **RMSE (Root Mean Squared Error)**: FSRS-6 achieves significantly lower RMSE than SM-2, indicating better calibration between predicted and actual recall probabilities
- **Log Loss**: FSRS-6 outperforms SM-2 across all users, with 99.6% superiority (99.6% of users have lower log loss with FSRS-6 than SM-2)
- **AUC (Area Under Curve)**: FSRS achieves better discrimination between recalled and forgotten cards

**Superiority Metrics**:
- FSRS-6 (with recency weighting) vs SM-2: 99.6% superiority
- FSRS-6 (default parameters) vs SM-2: 91.9% superiority
- This means only 1 in 100 users would be better off with SM-2 when using optimized FSRS parameters

### Adaptability

**FSRS**:
- Personalizes all 21 parameters to individual users
- Recognizes per-card difficulty differences
- Adapts to changing study patterns (vacations, inconsistent schedules)
- Handles new cards and mature cards differently
- Accounts for same-day reviews (FSRS-5+)

**SM-2**:
- Uses same parameters for all users (only ease factor varies per card)
- Cannot detect inherent difficulty differences
- No adaptation to study pattern changes
- Treats all cards with the same ease factor framework
- No concept of same-day review optimization

### User Feedback

**FSRS Users Report**:
- 20-30% reduction in daily review time
- Reduced frustration when failing cards (no reset to day 1)
- More confidence that "learned" cards are actually retained
- Lighter review loads with same knowledge retention
- Better handling of large collections (medical students, language learners)

**SM-2 Users Experience**:
- Simple, predictable scheduling
- Easy to understand why cards appear when they do
- "Ease hell" when cards become too difficult
- Frustration with card resets after failures
- Cognitive load from having to calibrate ease ratings manually

---

## Sources

1. https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm - Comprehensive FSRS algorithm documentation with formulas and parameters
2. https://expertium.github.io/Benchmark.html - Extensive benchmark comparing 15+ spaced repetition algorithms on 350M reviews
3. https://www.mintdeck.app/blog/fsrs-spaced-repetition-algorithm - Detailed explanation of FSRS's three-component model and advantages
4. https://domenic.me/fsrs/ - Personal analysis of FSRS adoption and comparison to SM-2
5. https://faqs.ankiweb.net/what-spaced-repetition-algorithm - Official Anki documentation on SM-2 and FSRS
6. https://github.com/thyagoluciano/sm2 - Simple SM-2 implementation showing algorithm complexity
7. https://borretti.me/article/implementing-fsrs-in-100-lines - Demonstrates FSRS can be implemented in ~100 lines
8. https://www.supermemo.com/en/supermemo-method - Original SuperMemo documentation describing SM-2
9. https://forums.ankiweb.net/t/sm-2-algorithm-pseudo-code/8350 - Community discussion of SM-2 implementation
10. https://www.brainscape.com/academy/comparing-spaced-repetition-algorithms/ - Comparison of different SRS algorithm types
11. https://github.com/RickCarlino/femto-fsrs - TypeScript implementation of FSRS in ~100 lines
12. https://help.remnote.com/en/articles/9124137-the-fsrs-spaced-repetition-algorithm - RemNote's FSRS explanation

---

## Recommendation for Simple Implementation

### Which Algorithm is Better for MVP?

**SM-2 is strongly recommended for MVP** due to its simplicity and ease of implementation. While FSRS provides superior performance, the complexity difference is significant:

**SM-2 Implementation**:
- 50-100 lines of code
- Basic arithmetic operations only
- No machine learning or optimization
- Can be implemented in a day
- Proven, predictable behavior
- Sufficient for most initial use cases

**FSRS Implementation**:
- 100+ lines for basic version, 300+ for full features
- Requires optimization algorithms
- More complex mathematical functions
- Parameter tuning and optimization system
- Several days to implement properly
- Better performance but overkill for early-stage products

### Implementation Complexity Comparison

| Aspect | SM-2 | FSRS |
|--------|------|------|
| Core algorithm | 50-100 lines | 100+ lines (basic), 300+ (full) |
| Parameters | 3-5 per card | 21 global + 3 per card |
| Math operations | Basic arithmetic | Power functions, logarithms |
| Optimization | None required | Gradient descent/ML needed |
| State tracking | Interval, ease factor | Difficulty, stability, retrievability |
| Development time | 1-2 days | 3-7 days |
| Runtime computation | O(1) | O(1) but more expensive |

### When to Consider Switching

**Consider upgrading to FSRS when**:

1. **User scale**: When you have significant user base generating review data
2. **Performance critical**: When study efficiency directly impacts user satisfaction
3. **Data availability**: When you have collected hundreds/thousands of reviews per user
4. **Competitive advantage**: When differentiation matters in the market
5. **Resource availability**: When you have development time to implement properly

**SM-2 is sufficient when**:

1. **Early-stage MVP**: Testing product-market fit
2. **Small user base**: Few users, limited data for optimization
3. **Simple use cases**: Casual learners with small card collections
4. **Resource constrained**: Limited development time
5. **Fast iteration needed**: Need to ship quickly and iterate

### Migration Strategy

If starting with SM-2, plan for eventual FSRS migration:
- Store comprehensive review logs (interval length, grade, timestamp)
- Track card-level statistics (success rate, failure rate, review history)
- Design architecture to support both algorithms simultaneously
- This allows gradual migration without data loss

### Bottom Line

**Start with SM-2 for MVP**. It provides solid spacing repetition functionality with minimal development overhead. The 20-30% efficiency gain from FSRS is valuable but not critical for early-stage product validation. Once you have users and data, implementing FSRS becomes a high-impact optimization that can significantly differentiate your product and improve user retention.
