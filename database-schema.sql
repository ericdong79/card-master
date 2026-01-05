-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.card (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  owner_user_id uuid NOT NULL,
  card_pack_id uuid NOT NULL,
  prompt text NOT NULL,
  answer text NOT NULL,
  status text NOT NULL,
  CONSTRAINT card_pkey PRIMARY KEY (id),
  CONSTRAINT card_card_pack_id_fkey FOREIGN KEY (card_pack_id) REFERENCES public.card_pack(id),
  CONSTRAINT card_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.card_pack (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL,
  status text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  CONSTRAINT card_pack_pkey PRIMARY KEY (id),
  CONSTRAINT card_pack_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.card_scheduling_state (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  card_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  due_at timestamp without time zone NOT NULL,
  state jsonb NOT NULL,
  last_reviewed_at timestamp without time zone NOT NULL,
  last_event_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT card_scheduling_state_pkey PRIMARY KEY (id),
  CONSTRAINT card_scheduling_state_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.card(id),
  CONSTRAINT card_scheduling_state_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.scheduling_profile(id),
  CONSTRAINT card_scheduling_state_last_event_id_fkey FOREIGN KEY (last_event_id) REFERENCES public.review_event(id),
  CONSTRAINT card_scheduling_state_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.review_event (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  grade smallint NOT NULL,
  time_ms bigint NOT NULL,
  raw_payload jsonb,
  reviewed_at timestamp without time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT review_event_pkey PRIMARY KEY (id),
  CONSTRAINT review_event_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.card(id),
  CONSTRAINT review_event_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.scheduling_profile (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  algorithm_key text NOT NULL,
  parameters jsonb NOT NULL,
  version bigint NOT NULL,
  owner_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT scheduling_profile_pkey PRIMARY KEY (id),
  CONSTRAINT scheduling_profile_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
);
