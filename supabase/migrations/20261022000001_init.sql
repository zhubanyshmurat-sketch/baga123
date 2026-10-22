-- StudentMind: schema, row level security and helper functions.
-- Public content is readable by everyone; personal records are visible only to their owner.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('student', 'editor', 'admin');
create type public.content_status as enum ('draft', 'published');
create type public.exercise_type as enum ('breathing', 'grounding', 'diary', 'planner', 'pomodoro');
create type public.help_kind as enum ('emergency', 'hotline', 'university');
create type public.favorite_type as enum ('article', 'exercise', 'topic', 'test');

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  language text not null default 'kk' check (language in ('kk', 'ru')),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  role public.user_role not null default 'student',
  consent_at timestamptz,
  consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers. SECURITY DEFINER so policies can read profiles without recursion.
create function public.app_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.is_editor() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.app_role() in ('editor', 'admin'), false)
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.app_role() = 'admin', false)
$$;

-- A profile is created automatically for every new auth user. Registration passes
-- display_name, language and consent through the sign-up metadata.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  has_consent boolean := (meta ->> 'consent') = 'true';
begin
  insert into public.profiles (id, display_name, language, consent_at, consent_version)
  values (
    new.id,
    nullif(left(trim(coalesce(meta ->> 'display_name', '')), 60), ''),
    case when meta ->> 'language' in ('kk', 'ru') then meta ->> 'language' else 'kk' end,
    case when has_consent then now() end,
    case when has_consent then coalesce(meta ->> 'consent_version', '1') end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Public content
-- ---------------------------------------------------------------------------
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  icon text not null default 'heart',
  sort_order int not null default 0,
  title_kk text not null,
  title_ru text not null,
  description_kk text not null default '',
  description_ru text not null default '',
  -- { what, signs[], causes[], tips[], specialist } per language
  content_kk jsonb not null default '{}'::jsonb,
  content_ru jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_kk text not null,
  title_ru text not null,
  excerpt_kk text not null default '',
  excerpt_ru text not null default '',
  body_kk text not null default '',
  body_ru text not null default '',
  today_steps_kk text[] not null default '{}',
  today_steps_ru text[] not null default '{}',
  tags_kk text[] not null default '{}',
  tags_ru text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb,
  reading_time int not null default 5 check (reading_time between 1 and 60),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index articles_topic_idx on public.articles (topic_id);
create index articles_published_idx on public.articles (status, published_at desc);

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_kk text not null,
  title_ru text not null,
  description_kk text not null default '',
  description_ru text not null default '',
  duration_min int not null default 3 check (duration_min between 1 and 30),
  -- [{ level, min, max, title_kk, title_ru, summary_kk, summary_ru,
  --    recommendations_kk[], recommendations_ru[], exercise_slugs[], specialist_kk, specialist_ru }]
  thresholds jsonb not null default '[]'::jsonb,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  text_kk text not null,
  text_ru text not null,
  -- [{ value, weight, label_kk, label_ru, alert? }]; `alert` marks an answer that shows
  -- the support block on a sensitive question
  options jsonb not null default '[]'::jsonb,
  is_sensitive boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index test_questions_test_idx on public.test_questions (test_id, sort_order);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  type public.exercise_type not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_kk text not null,
  title_ru text not null,
  description_kk text not null default '',
  description_ru text not null default '',
  instructions_kk text[] not null default '{}',
  instructions_ru text[] not null default '{}',
  duration_min int not null default 5 check (duration_min between 1 and 60),
  config jsonb not null default '{}'::jsonb,
  popular boolean not null default false,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercise_topics (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  primary key (exercise_id, topic_id)
);

create table public.help_contacts (
  id uuid primary key default gen_random_uuid(),
  kind public.help_kind not null default 'hotline',
  name_kk text not null,
  name_ru text not null,
  description_kk text not null default '',
  description_ru text not null default '',
  phone text not null,
  hours_kk text not null default '',
  hours_ru text not null default '',
  city_kk text not null default '',
  city_ru text not null default '',
  is_active boolean not null default true,
  sort_order int not null default 0,
  -- manual verification trail: contacts must be re-checked every quarter
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger topics_updated before update on public.topics
  for each row execute function public.set_updated_at();
create trigger articles_updated before update on public.articles
  for each row execute function public.set_updated_at();
create trigger tests_updated before update on public.tests
  for each row execute function public.set_updated_at();
create trigger exercises_updated before update on public.exercises
  for each row execute function public.set_updated_at();
create trigger help_contacts_updated before update on public.help_contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Personal data (owner-only; encrypted columns hold ciphertext produced by the server)
-- ---------------------------------------------------------------------------
create table public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mood smallint not null check (mood between 1 and 5),
  entry_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);
create trigger mood_entries_updated before update on public.mood_entries
  for each row execute function public.set_updated_at();

create table public.emotion_diary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  emotion text not null check (char_length(emotion) between 1 and 40),
  intensity smallint not null check (intensity between 1 and 10),
  -- AES-GCM ciphertext of { cause, thought, note }; see src/lib/crypto.ts
  payload_enc text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index emotion_diary_user_idx on public.emotion_diary (user_id, created_at desc);
create trigger emotion_diary_updated before update on public.emotion_diary
  for each row execute function public.set_updated_at();

create table public.test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  test_id uuid not null references public.tests (id) on delete cascade,
  score int not null,
  max_score int not null,
  level text not null check (level in ('low', 'medium', 'high')),
  alert boolean not null default false,
  -- AES-GCM ciphertext of the answer array
  answers_enc text not null,
  created_at timestamptz not null default now()
);
create index test_results_user_idx on public.test_results (user_id, created_at desc);

create table public.exercise_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_slug text not null check (char_length(exercise_slug) <= 80),
  duration_sec int not null default 0 check (duration_sec between 0 and 86400),
  practiced_on date not null default ((now() at time zone 'Asia/Almaty')::date),
  created_at timestamptz not null default now()
);
create index exercise_sessions_user_idx on public.exercise_sessions (user_id, practiced_on desc);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type public.favorite_type not null,
  item_slug text not null check (char_length(item_slug) <= 120),
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_slug)
);

create table public.planner_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  quadrant smallint not null check (quadrant between 1 and 4),
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index planner_tasks_user_idx on public.planner_tasks (user_id, quadrant, sort_order);
create trigger planner_tasks_updated before update on public.planner_tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.articles enable row level security;
alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_topics enable row level security;
alter table public.help_contacts enable row level security;
alter table public.mood_entries enable row level security;
alter table public.emotion_diary enable row level security;
alter table public.test_results enable row level security;
alter table public.exercise_sessions enable row level security;
alter table public.favorites enable row level security;
alter table public.planner_tasks enable row level security;

-- Profiles: own row only. Admins may list profiles (never personal records).
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Only these columns can be edited directly; `role` and consent go through functions.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, language, theme) on public.profiles to authenticated;
revoke all on public.profiles from anon;

-- Content: published rows are public, drafts are visible to editors.
create policy topics_read on public.topics for select to anon, authenticated using (true);
create policy topics_write on public.topics for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

create policy articles_read on public.articles for select to anon, authenticated
  using (status = 'published' or public.is_editor());
create policy articles_write on public.articles for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

create policy tests_read on public.tests for select to anon, authenticated
  using (status = 'published' or public.is_editor());
create policy tests_write on public.tests for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

create policy test_questions_read on public.test_questions for select to anon, authenticated
  using (
    public.is_editor()
    or exists (
      select 1 from public.tests t where t.id = test_id and t.status = 'published'
    )
  );
create policy test_questions_write on public.test_questions for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

create policy exercises_read on public.exercises for select to anon, authenticated
  using (status = 'published' or public.is_editor());
create policy exercises_write on public.exercises for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

create policy exercise_topics_read on public.exercise_topics for select to anon, authenticated
  using (true);
create policy exercise_topics_write on public.exercise_topics for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- Help contacts: active ones are public, only admins manage them.
create policy help_contacts_read on public.help_contacts for select to anon, authenticated
  using (is_active or public.is_admin());
create policy help_contacts_write on public.help_contacts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke insert, update, delete, truncate on
  public.topics, public.articles, public.tests, public.test_questions,
  public.exercises, public.exercise_topics, public.help_contacts
from anon;

-- Personal tables: the owner only. There is deliberately no admin policy.
create policy mood_entries_own on public.mood_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy emotion_diary_own on public.emotion_diary for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy test_results_own on public.test_results for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exercise_sessions_own on public.exercise_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy planner_tasks_own on public.planner_tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on
  public.mood_entries, public.emotion_diary, public.test_results,
  public.exercise_sessions, public.favorites, public.planner_tasks
from anon;

-- ---------------------------------------------------------------------------
-- Functions callable from the app
-- ---------------------------------------------------------------------------

-- Records the user's consent to personal data processing (used after Google sign-in).
create function public.record_consent(p_version text default '1') returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  update public.profiles
     set consent_at = now(), consent_version = left(p_version, 20)
   where id = auth.uid();
end $$;

-- Deletes the caller's account. Every personal row goes with it (ON DELETE CASCADE).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Admin: change another user's role. Admins cannot change their own role (no lock-out).
create function public.set_user_role(target uuid, new_role public.user_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if target = auth.uid() then
    raise exception 'cannot change own role' using errcode = '42501';
  end if;
  update public.profiles set role = new_role where id = target;
end $$;

-- Admin: user directory (email, name, role). Contains no personal records.
create function public.admin_list_users()
returns table (id uuid, email text, display_name text, role public.user_role,
               created_at timestamptz, consent_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.display_name, p.role, p.created_at, p.consent_at
      from public.profiles p
      join auth.users u on u.id = p.id
     order by p.created_at desc;
end $$;

-- Calendar days (Asia/Almaty) on which the caller practised anything; feeds the streak counter.
create function public.practice_days(p_since date default (current_date - 400))
returns table (day date)
language sql stable security invoker set search_path = '' as $$
  select m.entry_date from public.mood_entries m
   where m.user_id = auth.uid() and m.entry_date >= p_since
  union
  select (d.created_at at time zone 'Asia/Almaty')::date from public.emotion_diary d
   where d.user_id = auth.uid() and d.created_at >= p_since
  union
  select (r.created_at at time zone 'Asia/Almaty')::date from public.test_results r
   where r.user_id = auth.uid() and r.created_at >= p_since
  union
  select s.practiced_on from public.exercise_sessions s
   where s.user_id = auth.uid() and s.practiced_on >= p_since
$$;

-- Editor: replace all questions of a test atomically. Runs as the caller, so RLS applies.
-- p_questions: [{ text_kk, text_ru, options, is_sensitive }] in display order.
create function public.replace_test_questions(p_test_id uuid, p_questions jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.test_questions where test_id = p_test_id;
  insert into public.test_questions
    (test_id, text_kk, text_ru, options, is_sensitive, sort_order)
  select p_test_id, q.text_kk, q.text_ru, q.options,
         coalesce(q.is_sensitive, false), q.ord::int
    from rows from (jsonb_to_recordset(p_questions)
           as (text_kk text, text_ru text, options jsonb, is_sensitive boolean))
         with ordinality as q(text_kk, text_ru, options, is_sensitive, ord);
end $$;

-- Functions are not callable by anonymous visitors unless they are meant to be.
revoke execute on function
  public.record_consent(text), public.delete_my_account(), public.set_user_role(uuid, public.user_role),
  public.admin_list_users(), public.practice_days(date), public.replace_test_questions(uuid, jsonb)
from public, anon;
grant execute on function
  public.record_consent(text), public.delete_my_account(), public.set_user_role(uuid, public.user_role),
  public.admin_list_users(), public.practice_days(date), public.replace_test_questions(uuid, jsonb)
to authenticated;
