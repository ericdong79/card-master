# Research Sources for Anki-like Memory-First Learning Systems

## [1] Ebbinghaus, H. (1885). Memory: A Contribution to Experimental Psychology
- **URL**: https://www.readingrockets.org/strategies/spaced-repetition/
- **Accessed**: January 2025
- **Type**: Academic paper (foundational)
- **Key Points**:
  - First documentation of the forgetting curve showing exponential memory decay
  - Established the spacing effect principle: distributed learning outperforms massed learning
  - Showed humans forget 50-80% of newly learned information within 24 hours without review
- **Relevance**: Provides the foundational cognitive science basis for all spaced repetition systems. Understanding the forgetting curve is essential for algorithm design.

## [2] Murre, J. M. J., & Dros, J. (2015). Replication and analysis of Ebbinghaus' forgetting curve
- **URL**: https://pmc.ncbi.nlm.nih.gov/articles/PMC4492928/
- **Accessed**: January 2025
- **Type**: Academic paper (replication study)
- **Key Points**:
  - Modern replication of Ebbinghaus's 1885 experiment confirming original findings
  - Analyzed mathematical fits for the forgetting curve
  - Confirmed exponential decay pattern with ~50% loss in first hour, 70% after 9 hours
  - Noted potential "jump upwards" at 24 hours possibly related to sleep-dependent consolidation
- **Relevance**: Validates original research with modern methods, provides mathematical basis for forgetting curve modeling in algorithms.

## [3] SuperMemo. (1990). Algorithm SM-2 Documentation
- **URL**: https://super-memory.com/english/ol/sm2.htm
- **Accessed**: January 2025
- **Type**: Technical documentation
- **Key Points**:
  - Original SM-2 algorithm specification by Dr. Piotr Wozniak
  - Ease factor formula: `EF' = EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02))`
  - Initial intervals: 1 day, then 6 days
  - Minimum EF of 1.3 to prevent cards from becoming "too easy"
  - Quality rating scale: 0=complete blackout, 5=perfect response
- **Relevance**: Source of truth for SM-2 algorithm implementation. Used by Anki and most SRS applications as foundation.

## [4] Jarrett Ye (2022-2024). FSRS (Free Spaced Repetition Scheduler) Algorithm Documentation
- **URL**: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
- **Accessed**: January 2025
- **Type**: Technical documentation (open-source project)
- **Key Points**:
  - Machine learning-based algorithm with 21 trainable parameters (FSRS-6)
  - Three-component model: Difficulty (D, 1-10), Stability (S), Retrievability (R)
  - Power function forgetting curve: `R(t,S) = (1 + factor × t/S)^(-w20)`
  - Optimizes for target retention (typically 80-90%)
  - Benchmarks show 20-30% reduction in daily study time vs SM-2
  - 91.9-99% of users perform better with FSRS than SM-2
- **Relevance**: State-of-the-art SRS algorithm. Recommended for production systems but may be overkill for MVP due to complexity.

## [5] Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention
- **URL**: https://pmc.ncbi.nlm.nih.gov/articles/PMC6410796/
- **Accessed**: January 2025
- **Type**: Academic paper (seminal)
- **Key Points**:
  - Retrieval practice produces effect sizes of d=0.50 to d=1.20 compared to restudy
  - Classic study: retrieval practice produced 80% retention after one week vs 36% for repeated restudy
  - Active recall strengthens memory more than passive review
  - Testing effect produces both backward benefits (improved retention of tested items) and forward benefits (enhanced learning of subsequent material)
- **Relevance**: Strong scientific justification for retrieval practice as primary learning mechanism. Should inform UI design to prioritize active recall.

## [6] Smolen, P., Baxter, D. A., & Byrne, J. H. (2016). Molecular mechanisms underlying the specificity and timing of memory consolidation
- **URL**: https://pmc.ncbi.nlm.nih.gov/articles/PMC5126970/
- **Accessed**: January 2025
- **Type**: Academic paper (neuroscience)
- **Key Points**:
  - CREB activation in mouse hippocampus peaks at ~45 minutes after training
  - Protein synthesis-dependent processes require ~20-30 minutes between stimulations for optimal LTP
  - Minimum refractory period of approximately 60 minutes between theta-burst stimulations
  - Spaced learning produces more extensive dendritic spine remodeling than massed learning
  - Sleep-dependent consolidation enhances memory more than wake intervals
- **Relevance**: Provides minimum spacing thresholds (1-2 hours) that algorithms should enforce to prevent ineffective massed repetition.

## [7] Wiklund-Hörnqvist, C., et al. (2020). Retrieval practice and the hippocampus: fMRI evidence for dual action
- **URL**: https://pmc.ncbi.nlm.nih.gov/articles/PMC7821628/
- **Accessed**: January 2025
- **Type**: Academic paper (neuroscience)
- **Key Points**:
  - Posterior hippocampus activity scales linearly with each successful retrieval
  - Anterior hippocampus shows threshold activation after 4-6 successful retrievals
  - This "dual action" explains why retrieval practice is robust across materials and populations
  - Posterior supports detailed, item-specific memories
  - Anterior supports abstract, gist-like representations
- **Relevance**: Neural evidence explaining why spaced repetition works so effectively. Supports successive relearning approach with multiple retrievals.

## [8] Cepeda, N. J., et al. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention
- **URL**: https://www.sciencedirect.com/science/article/pii/S2211124725000038
- **Accessed**: January 2025
- **Type**: Academic paper (meta-analysis)
- **Key Points**:
  - Optimal spacing is 10-20% of desired retention interval
  - For 24-hour retention: optimal spacing is 20-60% (5-15 hours)
  - For 7-day retention: optimal spacing is 10-40% (0.7-3 days)
  - For 35-day retention: optimal spacing is 5-20% (2-7 days)
  - For 1-year retention: optimal spacing is 5-10% (18-36 days)
  - Inverted-U relationship: intervals too short or too long both reduce effectiveness
- **Relevance**: Provides concrete spacing interval recommendations that can inform algorithm default parameters and user education.

## [9] RemNote Help Center. Concept/Descriptor Framework Documentation
- **URL**: https://help.remnote.com/en/articles/6026154-structuring-knowledge-with-the-concept-descriptor-framework
- **Accessed**: January 2025
- **Type**: Product documentation
- **Key Points**:
  - Three-component model: Concepts (bold, real entities), Descriptors (italic, properties), Relationships (links)
  - Concepts form hierarchies (Computer → Screen → Browser)
  - Descriptors test on parent Concept, not themselves
  - Universal Descriptors with ~ prefix for reusable properties
  - Mirrors how human cognition naturally structures information
  - Automates effective flashcard generation
- **Relevance**: RemNotes' core innovation. Provides reference for advanced knowledge organization, though full implementation can be deferred in simpler systems.

## [10] Wozniak, P. (1990). SuperMemo Algorithm SM-2
- **URL**: https://supermemo.guru/wiki/Algorithm_SM-2
- **Accessed**: January 2025
- **Type**: Technical documentation (historical)
- **Key Points**:
  - SM-2 first used December 13, 1987 in SuperMemo 1.0
  - Ease factors allowed to vary between 1.1 (difficult) and 2.5 (easy)
  - Items with EF below 1.3 repeated annoyingly often and had formulation flaws
  - Initial intervals: I(1) = 1 day, I(2) = 6 days
  - Subsequent: I(n) = I(n-1) × EF
  - Note: For q=4, ease factor does not change
- **Relevance**: Historical context for SM-2 algorithm. Provides original ease factor formula and interval calculation rules.

## [11] AnkiWeb. SM-2 Algorithm FAQ
- **URL**: https://faqs.ankiweb.net/what-spaced-repetition-algorithm
- **Accessed**: January 2025
- **Type**: Product documentation
- **Key Points**:
  - Anki's modifications to SM-2: learning steps in minutes, four-button system, lateness factoring
  - Prevents "ease hell" by not decreasing ease during learning phase
  - Four-button mapping: Again < 3, Hard ≈ 3, Good ≈ 4, Easy ≈ 5
  - Learning steps typically [1, 10, 1440] (1 min, 10 min, 1 day)
  - Graduating interval: 1 day (Good), 4 days (Easy)
  - Fuzz factor adds randomization to prevent card clustering
- **Relevance**: Most widely-used SM-2 implementation. Practical modifications that address SM-2's shortcomings.

## [12] Fresh Cards. Guide to Writing Custom SRS Algorithms
- **URL**: https://freshcardsapp.com/srs/write-your-own-algorithm.html
- **Accessed**: January 2025
- **Type**: Technical guide
- **Key Points**:
  - Algorithms attempt to triangulate "memorability" and "user's memory quality"
  - Key signals: recall success, response difficulty, consecutive successes, current interval, lateness
  - Simplified SM-2 in 40 lines of Python (vlopezferrando/simple-spaced-repetition)
  - Per-card state: interval and ease factor sufficient for 80% effectiveness
  - Can safely remove: overdue handling, lapsed special handling, fuzzing, leech detection
- **Relevance**: Practical guidance on simplifying SM-2 for MVP. Shows minimal viable implementation is achievable quickly.

## [13] AnkiDroid Wiki. Database Structure Documentation
- **URL**: https://github.com/ankidroid/Anki-Android/wiki/Database-Structure
- **Accessed**: January 2025
- **Type**: Technical documentation (open-source project)
- **Key Points**:
  - Comprehensive SQLite schema for Anki database (.anki2 format)
  - Tables: cards, notes, revlog, decks, col, graves, tags
  - Cards state: 0=new, 1=learning, 2=review, 3=relearning
  - Queue: -3=sched buried, -2=user buried, -1=suspended, 0=new, 1=learning, 2=review
  - Ease factor stored as permille (e.g., 2500 = 2.5x multiplier)
  - Indexed queries on (deck_id, queue, due) for performance
- **Relevance**: Industry standard schema reference. Shows how to structure data for SRS applications.

## [14] Sartak. Anki 2 Annotated Schema
- **URL**: https://gist.github.com/sartak/3921255
- **Accessed**: January 2025
- **Type**: Technical documentation (community)
- **Key Points**:
  - Early annotated documentation of Anki's database structure
  - Community-contributed clarifications of complex fields
  - JSON structures for models, decks, and dconf in col table
  - Graves table for sync (deleted items tracking)
  - Field separation using 0x1f character in notes.flds
- **Relevance**: Complements official AnkiDroid documentation with community insights and clarifications.

## [15] Borretti, F. (2023). Hashcards: Plain-Text Spaced Repetition
- **URL**: https://borretti.me/article/hashcards-plain-text-spaced-repetition
- **Accessed**: January 2025
- **Type**: Technical article
- **Key Points**:
  - File-based approach using Markdown instead of database
  - Content-addressable design (cards identified by hash of content)
  - SQLite for scheduling state only, content in plain text
  - Version control friendly, editor agnostic
  - Natural Git integration
  - Requires re-hashing on content changes
- **Relevance**: Innovative approach to persistence. Alternative to traditional database for technical users, though adds complexity.

## [16] Borretti, F. Implementing SM-2 in Rust
- **URL**: https://borretti.me/article/implementing-sm2-in-rust
- **Accessed**: January 2025
- **Type**: Technical article
- **Key Points**:
  - Closed-form expression: I(n) = 6 × EF^(n-2) for n ≥ 3
  - Simplified EF formula: f(q) = -0.8 + 0.28q - 0.02q²
  - Eases below 1.3 result in cards repeated annoyingly often
  - At q=4, ease factor does not change
  - Much easier to push EF down or keep same than to push it up
  - Minimum EF of 1.3 prevents "interval hell"
- **Relevance**: Mathematical explanation of SM-2. Provides efficient closed-form calculation and simplified EF formula.

## [17] Control-Alt-Backspace. Spacing Algorithm Guide
- **URL**: https://controlaltbackspace.org/spacing-algorithm/
- **Accessed**: January 2025
- **Type**: Technical guide
- **Key Points**:
  - Builds from first principles: doubling → Leitner → SM-2
  - Doubling algorithm: 5-10 lines, 60% accuracy
  - Leitner system: 20-30 lines, 70% accuracy
  - SM-2 Lite: 30-50 lines, 80% accuracy
  - SM-2 Full: 100+ lines, 85% accuracy
  - FSRS: 100-300+ lines, 90% accuracy
  - Simplifications are safe for MVP (overdue, leeches, fuzzing can be removed)
- **Relevance**: Clear progression from simple to complex algorithms. Helps choose appropriate complexity level for development stage.

## [18] Matuschak, A. (2020). How to Write Good Prompts: Using Spaced Repetition to Create Understanding
- **URL**: https://andymatuschak.org/prompts/
- **Accessed**: January 2025
- **Type**: Technical manuscript
- **Key Points**:
  - Prompts should invoke effortful retrieval from memory
  - "Which tasks, when performed in aggregate, require lighting bulbs which are activated when you have that idea 'fully loaded' into your mind?"
  - Questions involving too much detail dull concentration and cause incomplete retrievals
  - Prompts are cheaper than imagined (10-30 seconds total over first year)
  - Spaced repetition systems work only as well as prompts you give them
  - Design prompts for future self, not present self
- **Relevance**: Most comprehensive guide to prompt design. Provides philosophical foundation for effective card creation.

## [19] Traverse. 10 Rules to Create Effective Flashcards for Mastering Complex Subjects
- **URL**: https://traverse.link/spaced-repetition/how-to-make-good-flashcards
- **Accessed**: January 2025
- **Type**: Technical guide
- **Key Points**:
  - 10 practical rules with good vs bad examples
  - Focus on precision, visualization, personalization, mnemonics, consistency
  - Visual information remembered better than textual (Pictorial Superiority Effect)
  - Quality over quantity: fewer well-designed cards better than many poorly-designed cards
  - Learn before memorize: only create cards for understood material
  - Don't LIMIT yourself to just Anki; think in first principles
- **Relevance**: Actionable card design principles. Good/bad examples make abstract concepts concrete.

## [20] Wozniak, P. (1999). Effective Learning: Twenty Rules of Formulating Knowledge
- **URL**: https://www.supermemo.com/en/blog/twenty-rules-of-formulating-knowledge
- **Accessed**: January 2025
- **Type**: Technical documentation (foundational)
- **Key Points**:
  - Foundational document for spaced repetition community
  - "Don't learn things that you do not understand"
  - Speed of learning depends on way you formulate material
  - Same material can be learned many times faster if well formulated
  - Items with EF below 1.3 repeated annoyingly often with formulation flaws
  - Keep items simple (atomic)
  - Use cloze deletion for complex knowledge
- **Relevance**: Historical foundation for card design principles. Influenced Anki, RemNotes, and entire SRS ecosystem.

## [21] RemNote Help Center. Creating Concept/Descriptor Flashcards
- **URL**: https://help.remnote.com/en/articles/6751778-creating-concept-descriptor-flashcards
- **Accessed**: January 2025
- **Type**: Product documentation
- **Key Points**:
  - Keyboard shortcuts: Ctrl+Alt+C (Concept), Ctrl+Alt+D (Descriptor)
  - Syntax: `::` for Concept cards, `;;` for Descriptor cards
  - `:>` or `:<` for one-directional cards
  - Universal Descriptors with ~ prefix (e.g., ~Advantage, ~Disadvantage)
  - Descriptors test on parent Concept (e.g., showing "PC" asks for "Personal Computer")
  - Concepts generate bidirectional cards by default
- **Relevance**: Practical guide to implementing CDF. Shows syntax and shortcuts for low-friction card creation.

## [22] RemNote Help Center. Flashcard Basics
- **URL**: https://help.remnote.com/en/articles/6025618-creating-flashcards
- **Accessed**: January 2025
- **Type**: Product documentation
- **Key Points**:
  - Flashcard types: Basic (>>), Concept (::), Descriptor (;;), Cloze ({{}}), Multi-line, List-answer, Multiple-Choice, Image Occlusion
  - Image occlusion with Ctrl+click/Cmd+click on images
  - Five scheduling ratings: Forgot, Partially recalled, Recalled with effort, Easily recalled, Skip
  - Exam Scheduler for short-term vs long-term goals
  - FSRS with auto-train weights for personalization
- **Relevance**: Overview of RemNotes' card types and scheduling. Shows range of features that can be implemented incrementally.

## [23] Bjornstad, S. Organizing Your Cards
- **URL**: https://controlaltbackspace.org/organizing-cards/
- **Accessed**: January 2025
- **Type**: Technical guide
- **Key Points**:
  - Hierarchical structures (decks): intuitive but limited flexibility (one deck per card)
  - Tag-based organization: flexible, allows cross-cutting topics
  - Free-form linking (RemNotes-style): bidirectional links, knowledge graphs
  - Concept networks: prerequisite relationships, personalized learning paths
  - Mixed practice: reviewing from different subjects together outperforms segregated study
  - Start simple: flat deck with optional tags is sufficient for MVP
- **Relevance**: Comprehensive guide to organization methods. Provides clear recommendations for MVP vs advanced features.

## [24] Frontend Mentor. Build a Flashcard App with Study Modes and Progress Tracking
- **URL**: https://www.frontendmentor.io/articles/build-a-flashcard-app-with-study-modes-and-progress-tracking-aOCRXXFul8
- **Accessed**: January 2025
- **Type**: Technical guide
- **Key Points**:
  - Modern UI design with study modes and progress tracking
  - Card flip animations with visual feedback
  - Clean, distraction-free review interface
  - Progress indicators (cards reviewed vs. remaining)
  - Responsive design for mobile/desktop
  - Keyboard shortcuts (Space, Enter, 1-4, arrows)
- **Relevance**: Practical UI/UX patterns. Shows how to design effective review interfaces with examples.

## [25] Mochi Cards. Local-First Design Showcase
- **URL**: https://mochi.cards/
- **Accessed**: January 2025
- **Type**: Product website
- **Key Points**:
  - Local-first flashcard app with clean modern interface
  - Markdown-based note-taking with live preview
  - Minimal UI with focus on learning
  - Images, LaTeX, and code support
  - Daily review queue with smart scheduling
- **Relevance**: Reference for modern, minimal UI design. Shows how to prioritize simplicity in flashcard apps.

## [26] Carpenter, S. K., Pan, S. C., & Butler, A. C. (2022). Extending the spacing and testing effects across development and adult life
- **URL**: https://www.nature.com/articles/s44159-022-00089-1
- **Accessed**: January 2025
- **Type**: Academic paper (review)
- **Key Points**:
  - Comprehensive review of spacing and retrieval practice across lifespan
  - Retrieval practice produces robust benefits across materials and populations
  - Benefits for Alzheimer's disease, multiple sclerosis, traumatic brain injury
  - Educational applications: foreign languages, mathematics, medical education, history
  - Sleep enhances consolidation more than wake periods
  - Forward testing effect: testing on earlier material enhances learning of subsequent material
- **Relevance**: Most current and comprehensive review of spacing research. Provides strong evidence base for SRS effectiveness across diverse contexts.

## Additional Sources Referenced

### AnkiWeb Documentation
- **URL**: https://docs.ankiweb.net/
- **Background**: Explains that Anki's system is based on SM-2 and introduces FSRS alternative

### LeanAnki
- **URL**: https://leananki.com/
- **Key Points**: EAT principles (Encoded, Atomic, Timeless), workflow integration focus

### Stanford CTL - Concept Mapping
- **URL**: https://ctl.stanford.edu/students/concept-mapping
- **Key Points**: Visual connections enhance understanding and recall, adaptable across subjects

### Justin Skycak - Individualized Spaced Repetition
- **URL**: https://justinmath.com/individualized-spaced-repetition-in-hierarchical-knowledge-structures/
- **Key Points**: Fractional Implicit Repetition (FIRe) model, repetition compression, encompassing graphs

### fsrs.js / ts-fsrs
- **URL**: https://github.com/open-spaced-repetition/fsrs.js, https://www.npmjs.com/package/ts-fsrs
- **Key Points**: TypeScript/JavaScript FSRS implementations with type safety

### py-fsrs
- **URL**: https://github.com/open-spaced-repetition/py-fsrs
- **Key Points**: Python FSRS package with scheduler and optimizer

### sm-2 (Python package)
- **URL**: https://github.com/open-spaced-repetition/sm-2
- **Key Points**: Python package for SM-2 algorithm with examples

### femto-fsrs
- **URL**: https://github.com/RickCarlino/femto-fsrs
- **Key Points**: FSRS implementation in ~100 lines TypeScript

### vlopezferrando/simple-spaced-repetition
- **URL**: https://github.com/vlopezferrando/simple-spaced-repetition
- **Key Points**: SM-2 in 40 lines Python, minimal API
