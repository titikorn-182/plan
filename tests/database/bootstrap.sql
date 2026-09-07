-- Only for the in-memory PostgreSQL harness. Supabase supplies these objects
-- itself in the full-stack E2E job. Application migrations are loaded unchanged.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema storage;
create schema extensions;
grant usage on schema public, auth, storage to authenticated, anon, service_role;
create table auth.users (
  id uuid primary key,
  instance_id uuid,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb default '{}'::jsonb,
  raw_app_meta_data jsonb default '{}'::jsonb,
  aud text,
  role text,
  confirmation_token text,
  recovery_token text,
  email_change_token_new text,
  email_change text,
  created_at timestamptz,
  updated_at timestamptz
);
create table auth.identities (
  id uuid primary key,
  user_id uuid references auth.users(id),
  provider_id text,
  identity_data jsonb,
  provider text,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  unique (provider_id, provider)
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table storage.buckets (
  id text primary key,
  name text,
  public boolean,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;
