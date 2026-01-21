# RemNotes Architecture and Design

## Summary

RemNote is a unique learning platform that bridges note-taking and spaced repetition through an integrated "memory-first" architecture. Unlike traditional flashcard systems like Anki that treat cards as isolated knowledge units, RemNote uses a unified data model where everything is a "Rem" - a node in a knowledge graph. The core innovation is the Concept/Descriptor Framework (CDF), which represents knowledge hierarchically as Concepts (bold, representing real entities) and Descriptors (italic, representing properties or questions), mirroring how human cognition naturally structures information. This architecture enables automatic flashcard generation from structured notes, bidirectional linking between all content types, and seamless integration between learning and knowledge management workflows.

The system was designed by former Anki users who felt constrained by question-answer formats and sought to create knowledge that mirrors how the brain actually stores and retrieves information. RemNote's philosophy emphasizes long-term knowledge growth, moving from "knowledge-management to knowledge-creation" by enabling users to learn once and remember forever through scientifically-backed spaced repetition algorithms (both Anki SM-2 and the newer FSRS). The architecture scales to hundreds of thousands of Rems while maintaining performance and organization, with features like portals for transclusion, hierarchical search, and multi-pane interfaces enabling sophisticated knowledge synthesis.

## Key Features

### Core Memory-First Learning Features

- **Unified Knowledge Base**: All content exists as Rems in a single interconnected graph, eliminating boundaries between notes, flashcards, PDFs, and documents
- **Concept/Descriptor Framework**: Knowledge structured as Concepts (bold) with Descriptors (italic) that mirror cognitive organization patterns
- **Automatic Flashcard Generation**: Flashcards created directly from notes using simple syntax (>>, ::, ;;, {{}})
- **Bidirectional Linking**: All Rems support linking and automatic backlink generation for knowledge interconnection
- **Hierarchical Organization**: Infinite depth nesting enables breaking complex ideas into "mind-sized bites"
- **Transclusion via Portals**: Rems can appear in multiple documents without duplication, enabling flexible knowledge composition

### Flashcard Creation and Scheduling

- **Five Flashcard Types**: Basic (>>), Concept (::), Descriptor (;;), Cloze ({{}}), Multiple-Choice, and Image Occlusion
- **Multiple Scheduling Algorithms**: Default Anki SM-2 and newer FSRS (20-30% more efficient, machine-learning based)
- **Three-Phase SM-2**: Learning (fixed intervals), Exponential (intervals multiply by ease factor), Relearning (after forgetting)
- **Exam Scheduler**: Built-in adjustment for short-term exam preparation vs long-term retention
- **Review Ratings**: Forgot, Partially recalled, Recalled with effort, Easily recalled, Skip
- **FSRS Optimization**: Can auto-train weights based on personal review history for personalized scheduling

### Note-Taking Integration with Flashcards

- **Seamless Conversion**: Any bullet point can become a flashcard with a single keystroke
- **Contextual Learning**: Flashcards automatically show ancestor context during review
- **Incremental Refinement**: Start with rough notes, progressively convert to structured, memorable knowledge
- **Rich Media Support**: Images, PDF annotations, LaTeX equations, code blocks
- **Multi-Modal Views**: Switch between outliner, graph view, and flashcard viewer for different perspectives
- **Omnibar Navigation**: Keyboard-driven workflow for rapid knowledge manipulation

### Concept/Descriptor Framework Explanation

The CDF models knowledge based on three cognitive components:

1. **Concepts**: Concrete or abstract things (e.g., Computer, Mouse, Cell, Plasma Membrane) that form hierarchical relationships. Bold formatting by convention.
2. **Descriptors**: Properties, questions, or attributes of Concepts (e.g., *weight*, *color*, *job in the cell*, *flexible or rigid*). Italic formatting, indented under parent Concept.
3. **Relationships**: Connections between Concepts using Rem References (bidirectional links), Tags (Type-Of relationships), and Aliases (alternative names).

Key design principles:
- Descriptors test on the parent Concept, not themselves (e.g., showing "PC" asks for "Personal Computer")
- Concepts generate bidirectional cards (name ↔ definition) by default
- Descriptors are forward-only by default but can generate backward cards testing parent Concepts
- Universal Descriptors and Templates enable reuse across similar Concept types
- The framework automatically generates "tiny prompts" for spaced repetition practice

### Key Differentiators from Anki

- **Knowledge Model**: RemNote uses structured Concept/Descriptor hierarchy vs Anki's flat card list
- **Interconnectivity**: Full bidirectional linking between all content vs limited tagging in Anki
- **Organization**: Hierarchical Knowledge Base built from Rems vs deck-based organization in Anki
- **Integration**: Notes and flashcards are the same data type vs separate systems in Anki
- **Context Awareness**: Flashcards show ancestor hierarchy during review vs isolated cards in Anki
- **Flexible Structure**: Users can choose organizational paradigms (folder/file, concept graphs, flat, single-root) vs fixed decks in Anki
- **Long-term Growth**: Built for lifelong knowledge management vs primarily memorization in Anki
- **Exam Focus**: Native exam scheduler for short-term goals vs manual workarounds in Anki

## Architecture

### Data Model for Notes and Cards

**Core Unit: The Rem**
- Everything is a Rem: bullets, flashcards, PDFs, documents, tags, images, web links
- Each Rem is a node in a graph with unique ID
- Rems have text content, hierarchy (parent/children), and metadata
- Flashcards are simply Rems with `text` (question) and `backText` (answer) fields
- Properties: `setText()`, `setBackText()`, `getCards()`, `setEnableBackwardPractice()`, `setEnableForwardPractice()`

**Hierarchy and Structure**
- Infinite depth nesting allows breaking down ideas recursively
- Parent-child relationships model composition ("part of") and taxonomy relationships
- Example: Cell > Plasma Membrane > *job in the cell*
- No "decks" - hierarchy emerges from Rem relationships themselves

**Linking Mechanisms**
- **Rem References**: `[[Concept Name]]` creates bidirectional links between any Rems
- **Tags**: `#TagName` expresses "Type-Of" semantic relationships; supports properties and templates
- **Aliases**: Rems can have multiple names appearing in search (e.g., "Active Recall" = "Retrieval Practice")
- **Backlinks**: Automatically generated and fully editable, sortable, filterable
- **Portals**: Transclude Rems from other documents with control over visible children

**Flashcard Types**
- Basic Card: `>>` or `==` between prompt and answer
- Concept Card: `::` creates bidirectional name↔definition cards
- Descriptor Card: `;;` creates forward cards testing Concept properties
- Cloze Card: `{{...}}` occludes text; supports hints with `{({Hint})}`
- Multi-line Card: `>>>` for front, nested bullets become card items
- List-Answer Card: `>>1.` for front, numbered list for answers
- Multiple-Choice: `>>A)` for front, first nested item is correct answer
- Image Occlusion: Ctrl+click/Cmd+click on images

**Metadata and State**
- Each card maintains: interval, ease, scheduling phase (Learning/Exponential/Relearning)
- Cards have priority settings, can be disabled from practice
- Practice direction: forward, backward, or both
- Tags can define Properties (structured fields) for Templates

### Scheduling Integration with Note-Taking

**Tight Coupling Design**
- Flashcards are not separate entities but attributes of Rems
- Editing a note automatically updates associated flashcards
- Context inheritance: Flashcards show ancestor Rems during review
- Can practice by document, folder, or global Knowledge Base

**Algorithm Selection**
- **Anki SM-2** (default): Three-phase system with ease factor and interval calculations
  - Learning Phase: Fixed steps (e.g., 30m, 2h, 2d)
  - Exponential Phase: Next interval = current interval × ease factor
  - Relearning Phase: After forgetting, interval = previous × Lapse Interval Multiplier (default 0.1)
  - Ease starts at 230%, min floor 130%, adjusted based on review quality
- **FSRS** (beta): Machine-learning based, 20-30% fewer reviews
  - Directly models retrievability, stability, difficulty
  - Optimizer can train weights on personal review history
  - Fewer user parameters; algorithm self-tunes

**Key Spaced Repetition Concepts**
- **Retrievability**: Probability of successful recall (aim for 90% target)
- **Stability**: How firmly memory is stored (days before retrievability drops below target)
- **Difficulty**: How hard to learn (easy cards gain stability faster)
- **Desired Retention**: User-configurable threshold (FSRS) or ~90% (SM-2)

**Special Scheduling Features**
- **Exam Scheduler**: Adjusts review intensity before specific exam dates
- **Learn Ahead Limit**: Shows learning-phase cards up to 15 minutes early
- **Custom Schedulers**: Create different algorithm configurations per document/folder
- **FSRS Optimization**: "Auto train weights" button analyzes review history

**Review Workflow Integration**
1. User reviews flashcards in practice session
2. Rating feedback updates card state (interval, ease, stability, difficulty)
3. System schedules next review based on selected algorithm
4. Card may show ancestor context for better recall cues
5. Reference links on cards enable jumping to source notes
6. Can edit flashcard answers directly from review interface

### Review Workflow

**Session Structure**
- Queue shows all due cards across Knowledge Base (or filtered scope)
- Cards ordered by due date and priority
- Multi-pane mode allows simultaneous viewing of notes and flashcard queue
- Statistics track: cards due, reviews completed, retention rate, stability metrics

**User Interaction**
1. Flashcard front shown (may include ancestor context)
2. User reveals back (Answer)
3. User rates: Forgot / Partially recalled / Recalled with effort / Easily recalled / Skip
4. System updates card scheduling parameters based on rating
5. Next card appears
6. Session ends when queue complete or user stops

**Rating Impact (SM-2)**
- **Forgot**: Return to Learning Phase start; ease -20%; interval × 0.1
- **Partially recalled**: Stay on same step; ease -15%; interval × 1.2
- **Recalled with effort**: Next step or Exponential; ease unchanged; interval × ease
- **Easily recalled**: Skip to Exponential; ease +15%; interval × ease × 1.3
- **Skip**: No rating; show again in 1 hour

**Rating Impact (FSRS)**
- More complex calculation using stability, difficulty, retrievability
- Optimizes for target retention (user-configurable)
- Accounts for review lateness/earliness
- Can handle varying desired retention per card set

**Post-Session**
- Queue visualization shows exponential growth of intervals over time
- Detailed statistics available: retention by card type, total reviews, stability growth
- Can jump to card source notes to edit or add context
- Exam scheduler shows predicted retention for upcoming exam dates

**Integration with Notes**
- While reviewing, can click any reference link to navigate to source
- Can open notes in parallel pane while studying
- Can edit flashcard content mid-session (edits persist)
- Can turn cards into bullet points or vice versa at any time
- Search allows finding specific cards or concepts rapidly

## Sources

1. https://help.remnote.com/en/articles/6026154-structuring-knowledge-with-the-concept-descriptor-framework - Official RemNote documentation on the Concept/Descriptor Framework, explaining the three-component model (Concepts, Descriptors, Relationships) and how it maps to human cognition.

2. https://help.remnote.com/en/articles/6751778-creating-concept-descriptor-flashcards - Technical guide on creating Concept and Descriptor cards, including keyboard shortcuts, syntax (::, ;;), and the unique backward-card behavior where Descriptors test parent Concepts.

3. https://help.remnote.com/en/articles/6026881-in-depth-biology-textbook-example - Extended example comparing Anki's isolated flashcard approach to RemNote's structured knowledge representation, showing how CDF makes hierarchical relationships explicit and supports knowledge refinement.

4. https://help.remnote.com/en/articles/6026144-the-anki-sm-2-spaced-repetition-algorithm - Detailed technical specification of the SM-2 algorithm implementation, covering Learning Phase, Exponential Phase, Relearning Phase, ease factor calculations, and parameter defaults.

5. https://help.remnote.com/en/articles/9124137-the-fsrs-spaced-repetition-algorithm - Documentation on the FSRS algorithm, explaining its machine-learning approach, 20-30% efficiency gains, retrievability/stability/difficulty model, and weight optimization features.

6. https://help.remnote.com/en/articles/9337171-understanding-spaced-repetition - Comprehensive guide to spaced repetition theory, covering the forgetting curve, exponential spacing, retrievability/stability/difficulty properties, and how algorithms determine optimal review timing.

7. https://help.remnote.com/en/articles/6025618-remnote-vs-anki-supermemo-and-other-spaced-repetition-tools - Comparison highlighting key architectural differences: CDF vs question-answer format, interlinked Knowledge Base vs card silos, hierarchical structure vs decks, and integrated note-taking vs separate systems.

8. https://nesslabs.com/remnote-featured-tool - Founders interview revealing design philosophy: "From knowledge-management to knowledge-creation," everything as a Rem, long-term focus, and goal of being an "extended brain" rather than just external memory.

9. https://help.remnote.com/en/articles/6025481-creating-flashcards - Guide to flashcard creation methods, showing how any Rem can become a card through simple syntax, supporting basic, concept, descriptor, cloze, multi-choice, and image occlusion types.

10. https://help.remnote.com/en/articles/6958056-custom-schedulers - Documentation on creating custom scheduler configurations with different algorithm types (Exponential, SM-2, FSRS) and assigning them to specific documents or folders.

## Notable Quotes

> "Instead of cramming all knowledge into question-answer blocks, RemNote helps you represent knowledge in the same way it's structured in your brain." - RemNote Help Center

> "Everything in RemNote is a node in a graph — a 'Rem'. This is true for bullets, flashcards, PDFs, documents, etc. We think our 'everything is a Rem' approach is simple but very powerful." - Martin Schneider, RemNote Co-founder

> "The Concept/Descriptor Framework is a particularly good fit for RemNote's model of your thoughts, and many people have found it to be an easy and highly effective method of learning." - Soren Bjornstad, RemNote Documentation

> "RemNote was built by Anki users who felt constrained by Anki's question-answer format." - RemNote Help Center

> "The core surprise is that practice (when done well, applying active recall methods) can be spaced out exponentially without significantly harming retention. After only a few repetitions it takes months and eventually years until you see a concept again." - Martin Schneider, RemNote Co-founder

> "We aim to make it easy for you to learn something once and then remember and leverage it forever." - Martin Schneider, RemNote Co-founder

> "From knowledge-management to knowledge-creation... We need to build tools that enable individuals to individually optimize their own thinking and learning." - Ness Labs interview with RemNote founders

> "Using the flashcard as your atomic unit of knowledge significantly restricts what you can easily use spaced repetition to learn and silos your knowledge into your flashcard tool." - Martin Schneider, RemNote Co-founder

> "Explicitly writing down a knowledge structure lets you manipulate it, add new parts to it, question it, and identify weaknesses in your understanding." - RemNote Help Center

> "Human memory, unlike computer memory, is based entirely on connections between ideas; the only way to retrieve a piece of information is to think of something related to it first." - RemNote Help Center

## Simplification Opportunities

### Features That Can Be Simplified for MVP

**Hierarchy Depth**: RemNote supports infinite nesting depth, but most users rarely go beyond 3-5 levels. MVP could implement depth limit (e.g., 8 levels) with plans for expansion.

**Multiple Scheduling Algorithms**: Start with only Anki SM-2 (proven, simple) rather than supporting both SM-2 and FSRS. FSRS can be added later as advanced feature.

**Complex Flashcard Types**: Support only Basic (>>), Concept (::), and Descriptor (;;) cards initially. Defer Cloze, Multi-line, List-Answer, Multiple-Choice, and Image Occlusion.

**Multiple Panes**: Single-pane interface initially. Multi-pane (side-by-side views) is power-user feature for knowledge synthesis.

**Portals and Transclusion**: Simple linking first (Rem References). Portals that transclude content from multiple locations can be added later.

**Custom Schedulers**: Single global scheduler initially. Per-document/folder schedulers are optimization for advanced users.

**Exam Scheduler**: Basic spaced repetition first. Exam-specific scheduling optimization can be added as enhancement.

**FSRS Optimization**: Start with default SM-2 parameters. Weight optimization based on review history is advanced feature.

**Templates and Universal Descriptors**: Manual creation of similar concepts first. Template system for consistency is power-user feature.

**Advanced Search**: Basic text search initially. Hierarchical search (expanding bullets within search) is sophisticated enhancement.

### Core Features to Keep

**Rem Data Model**: Everything as a node in graph - this is fundamental to unified knowledge/flashcard integration.

**Concept/Descriptor Framework**: The core innovation that distinguishes RemNote from Anki; essential for natural knowledge structuring.

**Basic Spaced Repetition**: SM-2 algorithm with learning/exponential/relearning phases is necessary for effective review scheduling.

**Bidirectional Linking**: Rem References with automatic backlinks enable knowledge interconnection - central to "extended brain" philosophy.

**Simple Flashcard Creation**: Keyboard shortcuts (>>, ::, ;;) to convert bullets to cards is critical for low-friction workflow.

**Basic Flashcard Types**: Basic, Concept, and Descriptor cards cover 90% of use cases and leverage CDF structure.

**Review Queue System**: Showing due cards with rating feedback (Forgot/Partial/Effort/Easy) is the interactive core.

**Context during Review**: Showing ancestor bullets when reviewing flashcards provides retrieval cues that improve learning.

**Basic Scheduling Parameters**: Interval tracking, ease factor, next review calculation are minimum required for functional SRS.

**Note Organization**: Documents, folders, and basic hierarchical structure are needed for knowledge management.

### Optional/Advanced Features to Defer

**AI Flashcard Generation**: Automated card creation from text is powerful but not required for core learning workflow.

**PDF Annotation and Linking**: Deep PDF integration is valuable but can be separate note-taking module initially.

**Web Clipper**: Capturing web content is convenience feature; users can copy-paste initially.

**Rich Media Support**: Images, LaTeX, code blocks can be added incrementally as needed.

**Graph Visualization**: Visual knowledge graph view is powerful but not essential for basic learning.

**Advanced Statistics**: Retention by card type, stability metrics, and detailed analytics are nice-to-have for power users.

**Omnibar Navigation**: Keyboard-driven quick access is efficiency feature; mouse navigation works initially.

**Tag Properties and Templates**: Structured data fields and template systems are advanced organization features.

**Alias System**: Multiple names for same Rem is convenience; single name works initially.

**Powerups and Edit Later**: Advanced card editing features during review are optimizations.

**Focus Mode and Tiling**: Interface refinements for productivity are not core to learning.

**Offline Mode**: Local-first architecture is important but can start with online-only for simpler MVP.

**Plugin System**: Extensibility is valuable but adds complexity; start with monolithic application.

**Sharing and Collaboration**: Multi-user features add significant complexity; focus on single-user learning first.

**Mobile Apps**: Cross-platform is important for real-world use but MVP can start with web/desktop.

**Multiple Choice Generation**: Card type variety is nice but Q&A format covers most learning scenarios.

**Lapses and Leech Detection**: Advanced card management can be added after basic scheduling works well.
