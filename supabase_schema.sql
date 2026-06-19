-- Run this in your Supabase project: SQL Editor → New query → paste → Run

-- Accounts table (stores hashed passwords)
create table if not exists accounts (
  username    text primary key,
  salt        text not null,
  hash        text not null,
  created_at  timestamptz default now()
);

-- Profiles table (avatar, cubits, owned items, playtime)
create table if not exists profiles (
  username      text primary key references accounts(username) on delete cascade,
  name          text,
  skin          bigint,
  shirt         bigint,
  legs          bigint,
  hat           jsonb,
  decal         jsonb,
  accessory     jsonb,
  cubits        integer default 100,
  owned         jsonb default '[]',
  play_ms       bigint default 0,
  earned_chunks integer default 0,
  updated_at    timestamptz default now()
);

-- Published worlds
create table if not exists published (
  id          text not null,
  username    text not null references accounts(username) on delete cascade,
  name        text,
  shared      boolean default true,
  blocks      jsonb,
  script      text,
  created     bigint,
  primary key (id, username)
);

-- User-created marketplace accessories
create table if not exists user_market (
  id          text not null,
  username    text not null references accounts(username) on delete cascade,
  name        text,
  price       integer default 50,
  by          text,
  acc         jsonb,
  primary key (id, username)
);

-- Leaderboard
create table if not exists leaderboard (
  game        text not null,
  username    text not null,
  player_name text,
  score       integer,
  ts          bigint,
  primary key (game, username)
);

-- Disable Row Level Security (functions use service role key, so RLS isn't needed)
alter table accounts    disable row level security;
alter table profiles    disable row level security;
alter table published   disable row level security;
alter table user_market disable row level security;
alter table leaderboard disable row level security;
