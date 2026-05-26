# Data Models and Persistence

## Summary

Flashcard applications require a data model that separates content (notes) from presentation (cards) while maintaining scheduling state for each card. The industry standard, established by Anki, uses a relational database (typically SQLite) with a clear separation between notes (the raw data fields) and cards (individual reviewable items generated from note templates). This model allows for multiple cards per note (e.g., forward/reverse, cloze deletions) and independent scheduling for each card side.

Modern implementations show two major approaches: the traditional database-centric model (Anki, AnkiDroid) and emerging file-based approaches (hashcards, GoCard) that store cards as plain text files with content-addressable storage. The scheduling state must track per-card metrics including interval (time until next review), ease factor (card difficulty multiplier), lapses (number of times forgotten), and last review timestamp. The most advanced algorithms like FSRS also track stability and difficulty parameters for more sophisticated scheduling.

Key design decisions revolve around supporting multiple card types (new, learning, review, relearning), handling filtered decks, maintaining review history for analytics, and enabling synchronization across devices. The minimal viable schema can significantly simplify from Anki's full implementation by removing features like filtered decks, note types with complex templates, and complex sync mechanisms.

## Core Entities

### Card/Note Schemas

**Notes** store the raw information content:
- `id`: Unique identifier (epoch milliseconds)
- `guid`: Globally unique identifier for sync
- `mid`: Model/note type ID (defines field structure and card templates)
- `tags`: Space-separated tags for categorization
- `flds`: Field values separated by 0x1f character
- `csum`: Checksum of first field for duplicate detection
- `sfld`: Sort field (integer representation for numeric sorting)

**Cards** are the individual items scheduled for review:
- `id`: Unique identifier
- `nid`: Reference to parent note
- `did`: Deck ID
- `ord`: Ordinal (which card template/cloze index)
- `type`: 0=new, 1=learning, 2=review, 3=relearning
- `queue`: -3=sched buried, -2=user buried, -1=suspended, 0=new, 1=learning, 2=review, 3=day learning, 4=preview
- `due`: Due date (different meanings per queue type)
- `ivl`: Interval in days (negative for learning = seconds)
- `factor`: Ease factor in permille (e.g., 2500 = 2.5x multiplier)
- `reps`: Total number of reviews
- `lapses`: Times card went from correct to incorrect
- `left`: Learning steps remaining (encoded as a*1000+b)
- `odue`/`odid`: Original due/deck for filtered decks

### Review Log/History

**Revlog** table records every review action:
- `id`: Timestamp of review (epoch milliseconds)
- `cid`: Reference to card
- `ease`: Rating (1=again, 2=hard, 3=good, 4=easy for review cards)
- `ivl`: Interval after review (negative=seconds, positive=days)
- `lastIvl`: Previous interval
- `factor`: Ease factor at time of review
- `time`: Time taken to answer (milliseconds, max 60s)
- `type`: 0=learn, 1=review, 2=relearn, 3=filtered, 4=manual, 5=rescheduled

### Scheduling State

Per-card scheduling state includes:
- Current interval (days until next review)
- Ease factor (difficulty multiplier, typically 1.3-3.0 range)
- Total reviews and lapse count
- Last review timestamp
- Current queue state (new, learning, review, etc.)

For FSRS algorithm, additional state:
- Stability (S): Interval when recall probability is 90%
- Difficulty (D): 1-10 scale of card difficulty
- Retrievability (R): Calculated, not stored directly

### Decks and Collections

**Decks** organize cards for study:
- `id`: Deck ID (epoch timestamp or special values like 1 for default)
- `name`: Deck hierarchy name
- `conf`: Reference to deck configuration group
- `dyn`: 1 if dynamic/filtered deck
- `newToday`/`revToday`/`lrnToday`: Daily usage statistics
- `extendNew`/`extendRev`: Extended limits for custom study

**Collection** stores global configuration and metadata:
- Single-row table containing:
  - `crt`: Collection creation timestamp
  - `ver`: Schema version
  - `models`: JSON of note type definitions
  - `decks`: JSON of deck definitions
  - `dconf`: JSON of deck configuration groups
  - `tags`: Tag cache
  - `conf`: Global configuration (active decks, preferences)

### Tags and Metadata

Tags are stored space-separated on notes with leading/trailing spaces for efficient LIKE queries. Tags can also be cached at the collection level for browser autocomplete. Additional metadata includes modification timestamps, sync sequence numbers (USN), and custom data fields.

## Schema Examples

### Anki SQLite Schema

```sql
-- Core cards table
CREATE TABLE cards (
    id              integer primary key,
    nid             integer not null,  -- notes.id
    did             integer not null,  -- deck id
    ord             integer not null,  -- card template/cloze index
    mod             integer not null,  -- modification time
    usn             integer not null,  -- sync sequence number
    type            integer not null,  -- 0=new,1=learning,2=review,3=relearning
    queue           integer not null,  -- -3/-2/-1/0/1/2/3/4
    due             integer not null,  -- varies by queue type
    ivl             integer not null,  -- interval in days
    factor          integer not null,  -- ease factor (permille)
    reps            integer not null,  -- review count
    lapses          integer not null,  -- failure count
    left            integer not null,  -- learning steps remaining
    odue            integer not null,  -- original due for filtered
    odid            integer not null,  -- original deck for filtered
    flags           integer not null,  -- user flags (0-4)
    data            text not null      -- unused
);

-- Notes table
CREATE TABLE notes (
    id              integer primary key,
    guid            text not null,
    mid             integer not null,  -- model id
    mod             integer not null,
    usn             integer not null,
    tags            text not null,  -- space-separated
    flds            text not null,  -- 0x1f separated fields
    sfld            integer not null,  -- sort field
    csum            integer not null,  -- checksum
    flags           integer not null,
    data            text not null
);

-- Review log
CREATE TABLE revlog (
    id              integer primary key,
    cid             integer not null,
    usn             integer not null,
    ease            integer not null,  -- 1-4 rating
    ivl             integer not null,  -- interval
    lastIvl         integer not null,  -- previous interval
    factor          integer not null,
    time            integer not null,  -- answer time (ms)
    type            integer not null
);

-- Collection metadata
CREATE TABLE col (
    id              integer primary key,
    crt             integer not null,  -- creation timestamp
    mod             integer not null,
    scm             integer not null,  -- schema mod time
    ver             integer not null,  -- schema version
    dty             integer not null,
    usn             integer not null,
    ls              integer not null,  -- last sync time
    conf            text not null,  -- config JSON
    models          text not null,  -- note types JSON
    decks           text not null,  -- decks JSON
    dconf           text not null,  -- deck config JSON
    tags            text not null
);

-- Deleted items for sync
CREATE TABLE graves (
    usn             integer not null,
    oid             integer not null,  -- original id
    type            integer not null   -- 0=card,1=note,2=deck
);
```

### Minimal Viable Schema

```sql
-- Simplified cards table
CREATE TABLE cards (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id         INTEGER NOT NULL,
    deck_id         INTEGER NOT NULL,
    state           TEXT NOT NULL,  -- 'new','learning','review'
    interval_days   INTEGER NOT NULL DEFAULT 0,
    ease_factor     REAL NOT NULL DEFAULT 2.5,
    reviews         INTEGER NOT NULL DEFAULT 0,
    lapses          INTEGER NOT NULL DEFAULT 0,
    due_date        INTEGER NOT NULL,  -- epoch timestamp
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

-- Notes table
CREATE TABLE notes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    question        TEXT NOT NULL,
    answer          TEXT NOT NULL,
    tags            TEXT,  -- JSON array
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

-- Review log
CREATE TABLE review_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id         INTEGER NOT NULL,
    rating          INTEGER NOT NULL,  -- 1-4
    previous_interval INTEGER NOT NULL,
    new_interval    INTEGER NOT NULL,
    time_spent_ms   INTEGER,
    reviewed_at     INTEGER NOT NULL
);

-- Decks
CREATE TABLE decks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    created_at      INTEGER NOT NULL
);
```

### In-Memory Data Structures (Python)

```python
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional

class CardState(Enum):
    NEW = "new"
    LEARNING = "learning"
    REVIEW = "review"
    RELEARNING = "relearning"

class Rating(Enum):
    AGAIN = 1
    HARD = 2
    GOOD = 3
    EASY = 4

@dataclass
class SchedulingData:
    interval: int  # days
    ease_factor: float  # multiplier
    reviews: int
    lapses: int
    due_date: datetime

@dataclass
class Card:
    id: str
    note_id: str
    question: str
    answer: str
    scheduling: SchedulingData
    state: CardState

@dataclass
class Note:
    id: str
    fields: dict[str, str]  # field name -> value
    note_type_id: str
    tags: list[str]
    cards: list[Card]
```

## Scheduling State

### What Data Must Be Tracked Per Card

**Essential for basic SM-2 algorithm:**
1. **Interval** (ivl): Days until next review
2. **Ease Factor** (factor): Multiplier for interval adjustment (1.3-3.0 range)
3. **Reviews** (reps): Total successful reviews count
4. **Lapses** (lapses): Count of failures after successful reviews
5. **Last Review**: Timestamp of most recent review (can be derived from revlog)
6. **Due Date**: When card should next be reviewed
7. **Current State**: new/learning/review/relearning

**Additional for learning queue:**
8. **Left** (left): Learning steps remaining (encoded)
9. **Learning Step Index**: Which step in current learning sequence

**Additional for filtered decks:**
10. **Original Due** (odue): Due date before moving to filtered deck
11. **Original Deck** (odid): Deck ID before moving to filtered deck

**For FSRS algorithm:**
12. **Stability** (S): Interval when R=90%
13. **Difficulty** (D): 1-10 scale
14. **Retrievability** (R): Calculated from stability and time elapsed

### Interval Tracking

Intervals represent time between reviews. Different meanings per card state:
- **New cards**: Due is an ordinal, not a date
- **Learning cards**: Negative interval = seconds until next review
- **Review cards**: Positive interval = days until next review

Interval calculation varies by algorithm:
- **SM-2/Anki**: `new_interval = old_interval * ease_factor * button_multiplier`
- **FSRS**: Uses stability and retrievability curves with learned parameters

### Ease Factor Tracking

Ease factor represents card difficulty as a multiplier:
- Initialized at 2.5 (2500 permille) for new cards
- Adjusted by ±0.15 for Hard/Easy ratings
- Minimum threshold of 1.3 prevents cards from getting "too easy"
- Used directly in interval calculation for review cards
- Anki stores as permille (1-10000), FSRS normalizes to 100-1100

### Last Review Timestamp

Critical for:
- Calculating days late for interval bonuses
- Computing retrievability (R) in FSRS: `R = 0.9^(t/S)`
- Analytics and study statistics
- Determining if cards are overdue

Anki stores this implicitly in revlog, not on the card record itself.

## Sources

1. [AnkiDroid Database Structure Wiki](https://github.com/ankidroid/Anki-Android/wiki/Database-Structure) - Comprehensive documentation of Anki's SQLite database schema, including detailed field descriptions and JSON object structures for models, decks, and configurations

2. [Anki 2 Annotated Schema (sartak)](https://gist.github.com/sartak/3921255) - Early annotated documentation of Anki's database structure with community-contributed clarifications

3. [FSRS Algorithm Wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) - Complete mathematical description of the FSRS algorithm, including all versions (v1 through v6) with formulas and default parameters

4. [Anki SRS Algorithm Explained](https://juliensobczak.com/inspect/2022/05/30/anki-srs/) - Detailed code walkthrough of Anki's scheduling implementation, including queue management and card rescheduling logic

5. [Hashcards: Plain-Text Spaced Repetition](https://borretti.me/article/hashcards-plain-text-spaced-repetition) - Innovative approach using Markdown files for card storage with content-addressable design and SQLite for scheduling state

6. [SuperMemo Algorithm Documentation](https://super-memory.com/english/algsm15.htm) - Original SM-2 algorithm specification that influenced Anki and most other SRS implementations

7. [Spaced Repetition Algorithm Comparison](https://languagelearning.stackexchange.com/questions/3757/which-srs-algorithm-yields-greatest-evidence-based-remembering) - Discussion comparing different SRS algorithms and their effectiveness

8. [Stack Overflow: Database Schema for Flashcard Projects](https://stackoverflow.com/questions/13111869/database-schema-logic-for-a-flashcard-language-project) - Community discussion on database design choices for flashcard applications

## Simplification Opportunities

### Minimal Viable Schema for MVP

**Essential tables only:**
- `cards` (scheduling state)
- `notes` (content)
- Optional: `review_log` (for analytics)
- Optional: `decks` (single deck MVP can skip)

**Removed complexity:**
- Filtered decks (`odue`, `odid` fields)
- Complex queue states (simplify to new/learning/review)
- Multiple card types per note (1:1 mapping initially)
- Note types and templates (single question/answer format)
- Sync sequence numbers (USN) for single-user systems
- Graves table (soft delete is sufficient)
- JSON-based configuration (hardcode defaults or simple settings table)

**Simplified card state:**
```python
enum CardState:
    NEW
    LEARNING  
    REVIEW
```

**Simplified scheduling:**
- Use SM-2 instead of FSRS (no stability/difficulty tracking)
- Hardcode learning steps instead of configurable
- Remove fuzzing and day boundary handling
- Skip ease hell protection initially

### Optional Fields for Later

**Phase 2 - Enhanced Scheduling:**
- Add `stability` and `difficulty` for FSRS
- Add custom learning steps per deck
- Add graduated/easy intervals

**Phase 3 - Advanced Features:**
- Add filtered deck support
- Add note types with multiple templates
- Add cloze deletion cards
- Add burrying/suspension

**Phase 4 - Multi-device Support:**
- Add GUIDs for sync
- Add USN (update sequence numbers)
- Add conflict resolution fields

## Technical Considerations

### Database Choices

**SQLite** (Anki, AnkiDroid):
- Pros: Embedded, single-file, ACID compliant, portable
- Cons: Limited write concurrency, no replication
- Best for: Desktop/mobile applications, single-user

**PostgreSQL/MySQL** (Web applications):
- Pros: Multi-user, replication, rich indexing
- Cons: Requires server infrastructure, more complex deployment
- Best for: Multi-user web apps with sync

**Turso** (Edge SQLite):
- Pros: SQLite at the edge, built-in replication
- Cons: New technology, limited ecosystem
- Best for: Serverless/edge deployments

**File-based** (hashcards, GoCard):
- Pros: Version control friendly, editor agnostic
- Cons: Requires indexing/scheduling database, complex parsing
- Best for: Developers, technical users wanting full control

### Performance Considerations

**Indexing requirements:**
- `cards(did, queue, due)` - Primary scheduling query
- `cards(nid)` - Finding all cards for a note
- `revlog(cid)` - Review history lookups
- `notes(csum)` - Duplicate detection

**Query patterns:**
- Due cards: `SELECT * FROM cards WHERE did=? AND queue=? AND due<=? LIMIT ?`
- New cards: `SELECT * FROM cards WHERE did=? AND queue=0 ORDER BY due LIMIT ?`
- Review history: `SELECT * FROM revlog WHERE cid=? ORDER BY id DESC`

**Scaling concerns:**
- Cards table grows linearly with collection size
- Revlog grows faster (one row per review)
- Partition revlog by date or card_id for large collections
- Consider materialized views for statistics

**Caching strategies:**
- Cache deck statistics (new/rev/lrn today)
- Cache tag counts for browser
- Preload due cards for session
- Maintain in-memory queues during study session

### Sync Considerations (Optional for MVP)

**Incremental sync approach:**
- Track modification timestamps (`mod` field)
- Use update sequence numbers (USN) for conflict detection
- Send deltas since last sync
- Resolve conflicts with server-wins or last-writer-wins

**Full sync alternative:**
- Simpler to implement
- Send entire database for changes
- Works for small collections
- Detect conflicts by comparing mod times

**Content-addressable sync (hashcards approach):**
- Cards identified by hash of content
- No conflicts, just divergent versions
- Natural Git integration
- Requires re-hashing on content changes

**Offline-first design:**
- All operations work without network
- Sync runs in background
- Optimize for mobile devices
- Handle sync gracefully (resume after network loss)

**Data migration:**
- Schema versioning required (Anki uses `ver` field)
- Graceful handling of missing fields
- Backward compatibility for older clients
- Migration scripts for schema changes
