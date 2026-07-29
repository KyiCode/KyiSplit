-- WARNING: Context snapshot supplied on 2026-07-29.
-- This file is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- Versioned migrations created in Phase 2 become the schema source of truth.

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  CONSTRAINT groups_pkey PRIMARY KEY (id)
);

CREATE TABLE public.group_members (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_group_name character varying,
  CONSTRAINT group_members_pkey PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid,
  name character varying NOT NULL,
  total numeric NOT NULL,
  date date NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  currency character varying,
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);

CREATE TABLE public.payments (
  expense_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  CONSTRAINT payments_pkey PRIMARY KEY (expense_id, user_id),
  CONSTRAINT payments_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id),
  CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.splits (
  expense_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  CONSTRAINT splits_pkey PRIMARY KEY (expense_id, user_id),
  CONSTRAINT splits_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id),
  CONSTRAINT splits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.invites (
  id integer NOT NULL DEFAULT nextval('invites_id_seq'::regclass),
  group_id uuid,
  token character varying NOT NULL UNIQUE,
  created_by uuid,
  expires_at timestamp without time zone,
  used boolean DEFAULT false,
  CONSTRAINT invites_pkey PRIMARY KEY (id),
  CONSTRAINT invites_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
