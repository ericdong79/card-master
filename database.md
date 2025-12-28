# Tables


## Card

Card without state information.

**Schema**
id (pk): uuid;
card_pack_id (fk): uuid;
prompt:string;  Prompt for the card.
answer:string;  Answer for the prompt.
status: active/suspended/deleted
owner_user_id:string;
created_at
updated_at

## Scheduling Profile

About algorithms

**Schema**
- id (pk): uuid;
- owner_user_id;
- algorithm_key: (sm2, fsrs ...);
- parameters: json;
- created_at;
- updated_at;


## Card Scheduling State

ast state snapshot and parameters for cache

**Schema**
- card_id (fk to card);
- profile_id (fk to scheduling profile);
- due_at
- state_json
- updated_at
- last_event_id
- last_reviewed_at;
- owner_user_id


## Review Events

Card review events

**Schema**
- id (pk) : uuid
- card_id (fk)
- reviewed_at
- grade: (0-5) Again / Hard / Good / Easy
- time_ms
- raw_payload json
- owner_user_id;


## Card Pack
Logical group of cards.

id (pk): uuid;
owner_user_id:string;
name:string;
created_at;
updated_at;
status: active/suspended/deleted;



