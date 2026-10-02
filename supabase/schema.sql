-- ============================================================================
-- Classora — Supabase schema
-- ============================================================================
-- Run this once in the Supabase SQL editor (or `supabase db push`).
--
-- Security model
--   * Every table carries `user_id uuid references auth.users on delete cascade`.
--   * Row Level Security is enabled on every table and the only policy is
--     "you may touch your own rows" (`user_id = auth.uid()`).
--   * The client ships only the anon key; nothing privileged is ever in the
--     bundle, and no service-role key is used.
--   * Attendance attaches to dated occurrences, never to the recurring
--     templates, so editing a timetable cannot rewrite history.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at honest without trusting the client.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles  (id === auth.users.id)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                         uuid primary key references auth.users on delete cascade,
  user_id                    uuid not null default auth.uid(),
  name                       text not null default 'Student',
  email                      text,
  avatar_url                 text,
  college                    text,
  department                 text,
  department_label           text,
  semester_label             text,
  student_id                 text,
  batch_roll                 text,
  timezone                   text not null default 'Asia/Kolkata',
  attendance_target          numeric(5,2) not null default 75 check (attendance_target between 0 and 100),
  safe_margin_alert_classes  integer not null default 3 check (safe_margin_alert_classes between 0 and 20),
  default_count_mode         text not null default 'period' check (default_count_mode in ('period','session')),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- semesters
-- ---------------------------------------------------------------------------
create table if not exists public.semesters (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  is_active   boolean not null default false,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint semesters_dates_ordered check (end_date >= start_date)
);

-- Only one active semester per user.
create unique index if not exists semesters_one_active
  on public.semesters (user_id)
  where is_active and not archived;

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------
create table if not exists public.subjects (
  id                     text primary key,
  user_id                uuid not null default auth.uid() references auth.users on delete cascade,
  semester_id            text not null references public.semesters (id) on delete cascade,
  name                   text not null,
  short_name             text not null default '',
  subject_code           text,
  faculty                text,
  default_room           text,
  class_type             text not null default 'theory' check (class_type in ('theory','lab','other')),
  attendance_count_mode  text not null default 'period' check (attendance_count_mode in ('period','session')),
  target_percentage      numeric(5,2) check (target_percentage is null or target_percentage between 0 and 100),
  color_key              text not null default 'indigo',
  archived               boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists subjects_semester_idx on public.subjects (semester_id);

-- ---------------------------------------------------------------------------
-- timetable_versions
-- ---------------------------------------------------------------------------
create table if not exists public.timetable_versions (
  id              text primary key,
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  semester_id     text not null references public.semesters (id) on delete cascade,
  version_number  integer not null check (version_number > 0),
  label           text not null default '',
  notes           text,
  signature       text not null default '',
  is_current      boolean not null default false,
  created_by      text not null default 'user' check (created_by in ('seed','user','import','restore')),
  created_at      timestamptz not null default now(),
  unique (semester_id, version_number)
);

create index if not exists versions_semester_idx on public.timetable_versions (semester_id, version_number desc);

-- ---------------------------------------------------------------------------
-- recurring_slots  (weekly template — never carries attendance)
-- ---------------------------------------------------------------------------
create table if not exists public.recurring_slots (
  id                    text primary key,
  user_id               uuid not null default auth.uid() references auth.users on delete cascade,
  timetable_version_id  text not null references public.timetable_versions (id) on delete cascade,
  semester_id           text not null references public.semesters (id) on delete cascade,
  subject_id            text not null,
  day_of_week           smallint not null check (day_of_week between 0 and 6),
  start_time            time not null,
  end_time              time not null,
  room                  text,
  faculty_override      text,
  class_type            text not null default 'theory',
  period_count          smallint not null default 1 check (period_count between 1 and 10),
  kind                  text not null default 'class' check (kind in ('class','break')),
  label                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint slots_time_ordered check (end_time > start_time)
);

create index if not exists slots_version_idx on public.recurring_slots (timetable_version_id);

-- ---------------------------------------------------------------------------
-- class_occurrences  (the only thing attendance may attach to)
-- ---------------------------------------------------------------------------
create table if not exists public.class_occurrences (
  id                        text primary key,
  user_id                   uuid not null default auth.uid() references auth.users on delete cascade,
  semester_id               text not null references public.semesters (id) on delete cascade,
  subject_id                text not null,
  date                      date not null,
  start_time                time not null,
  end_time                  time not null,
  start_date_time           timestamptz not null,
  end_date_time             timestamptz not null,
  room                      text,
  faculty_override          text,
  class_type                text not null default 'theory',
  period_count              smallint not null default 1,
  occurrence_type           text not null default 'regular'
                            check (occurrence_type in ('regular','extra','replacement')),
  schedule_status           text not null default 'scheduled'
                            check (schedule_status in ('scheduled','completed','cancelled','not_conducted','replaced','holiday')),
  source_timetable_slot_id  text,
  replaced_occurrence_id    text,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists occurrences_semester_date_idx
  on public.class_occurrences (semester_id, date);
create index if not exists occurrences_subject_idx
  on public.class_occurrences (subject_id, date);

-- ---------------------------------------------------------------------------
-- attendance_records
--   A unique constraint per occurrence means marking is idempotent: the client
--   can upsert without first checking whether a row exists.
-- ---------------------------------------------------------------------------
create table if not exists public.attendance_records (
  id             text primary key,
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  occurrence_id  text not null references public.class_occurrences (id) on delete cascade,
  subject_id     text not null,
  semester_id    text not null references public.semesters (id) on delete cascade,
  date           date not null,
  status         text not null check (status in ('present','absent','unmarked')),
  -- Frozen weight snapshot: later counting-rule edits cannot rewrite history.
  weight         numeric(4,1) not null default 1 check (weight > 0),
  marked_at      timestamptz,
  source         text not null default 'user' check (source in ('user','seed','sync')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (occurrence_id)
);

create index if not exists attendance_subject_idx on public.attendance_records (subject_id, date);
create index if not exists attendance_semester_idx on public.attendance_records (semester_id, date);

-- ---------------------------------------------------------------------------
-- calendar_overrides  (holidays, no-class days, working Saturdays)
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_overrides (
  id                  text primary key,
  user_id             uuid not null default auth.uid() references auth.users on delete cascade,
  semester_id         text not null references public.semesters (id) on delete cascade,
  date                date not null,
  kind                text not null
                      check (kind in ('holiday','no_class','follow_day','working_saturday','custom_schedule')),
  follow_day_of_week  smallint check (follow_day_of_week is null or follow_day_of_week between 0 and 6),
  label               text,
  scope               text not null default 'personal' check (scope in ('college','department','personal')),
  reason              text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists overrides_semester_idx on public.calendar_overrides (semester_id, date);

-- ---------------------------------------------------------------------------
-- occurrence_audit  (human-readable change history)
-- ---------------------------------------------------------------------------
create table if not exists public.occurrence_audit (
  id             text primary key,
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  occurrence_id  text,
  semester_id    text not null references public.semesters (id) on delete cascade,
  date           date not null,
  action         text not null,
  summary        text not null default '',
  detail         text,
  created_at     timestamptz not null default now()
);

create index if not exists audit_semester_idx on public.occurrence_audit (semester_id, created_at desc);

-- ---------------------------------------------------------------------------
-- timetable_imports  (AI extraction history; the file itself lives in Storage)
-- ---------------------------------------------------------------------------
create table if not exists public.timetable_imports (
  id             text primary key,
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  semester_id    text not null references public.semesters (id) on delete cascade,
  file_name      text not null default '',
  mime_type      text not null default 'application/octet-stream',
  size_bytes     bigint not null default 0,
  status         text not null default 'pending'
                 check (status in ('pending','extracting','review','saved','failed','discarded')),
  provider       text,
  -- Randomised Storage key. Never the user's original filename or path.
  storage_path   text,
  extracted      jsonb,
  warnings       jsonb not null default '[]'::jsonb,
  error_message  text,
  is_retained    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- app_notifications
-- ---------------------------------------------------------------------------
create table if not exists public.app_notifications (
  id              text primary key,
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  kind            text not null
                  check (kind in ('after_class','missing_attendance','risk','timetable_change','working_saturday','extra_class')),
  title           text not null default '',
  body            text not null default '',
  date            date not null,
  occurrence_ids  jsonb not null default '[]'::jsonb,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.app_notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- notification_preferences
-- ---------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  id                           text primary key,
  user_id                      uuid not null default auth.uid() references auth.users on delete cascade,
  after_class_reminder         boolean not null default true,
  reminder_delay_minutes       smallint not null default 10 check (reminder_delay_minutes in (0,10,30)),
  missing_attendance_reminder  boolean not null default true,
  attendance_risk_alert        boolean not null default true,
  timetable_change_alert       boolean not null default true,
  working_saturday_alert       boolean not null default true,
  combine_back_to_back         boolean not null default true,
  updated_at                   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id            text primary key,
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  theme         text not null default 'light' check (theme in ('light','system')),
  preview_date  date,
  onboarded     boolean not null default false,
  updated_at    timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles                enable row level security;
alter table public.semesters               enable row level security;
alter table public.subjects                enable row level security;
alter table public.timetable_versions      enable row level security;
alter table public.recurring_slots         enable row level security;
alter table public.class_occurrences       enable row level security;
alter table public.attendance_records      enable row level security;
alter table public.calendar_overrides      enable row level security;
alter table public.occurrence_audit        enable row level security;
alter table public.timetable_imports       enable row level security;
alter table public.app_notifications       enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.app_settings            enable row level security;

-- profiles keys on id; every other table keys on user_id.
drop policy if exists "profiles are self-service" on public.profiles;
create policy "profiles are self-service" on public.profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'semesters','subjects','timetable_versions','recurring_slots','class_occurrences',
    'attendance_records','calendar_overrides','occurrence_audit','timetable_imports',
    'app_notifications','notification_preferences','app_settings'
  ]
  loop
    execute format('drop policy if exists "own rows" on public.%I', table_name);
    execute format(
      'create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      table_name
    );
  end loop;
end;
$$;

-- ============================================================================
-- updated_at triggers
-- ============================================================================
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','semesters','subjects','recurring_slots','class_occurrences',
    'attendance_records','calendar_overrides','timetable_imports'
  ]
  loop
    execute format('drop trigger if exists touch_%I on public.%I', table_name, table_name);
    execute format(
      'create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

-- ============================================================================
-- New-user bootstrap
--   Create the profile row and default preferences the moment an account is
--   created, so the first cloud sign-in has somewhere to write.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, user_id, name, email, avatar_url)
  values (
    new.id,
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'student'), '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.notification_preferences (id, user_id)
  values ('notifpref-' || new.id, new.id)
  on conflict (id) do nothing;

  insert into public.app_settings (id, user_id, onboarded)
  values (new.id, new.id, false)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Storage — private bucket for uploads and exports
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('classora-uploads', 'classora-uploads', false)
on conflict (id) do nothing;

drop policy if exists "own uploads" on storage.objects;
create policy "own uploads" on storage.objects
  for all
  using (
    bucket_id = 'classora-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'classora-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
