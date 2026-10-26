-- Run once in your project's Supabase SQL editor. All CMS records are server-only.
create table if not exists public.cms_records (
  key text primary key,
  value jsonb not null,
  version integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.cms_records enable row level security;
revoke all on public.cms_records from anon, authenticated;
grant all on public.cms_records to service_role;
create table if not exists public.cms_rate_limits (
  key text primary key,
  hits integer not null,
  expires_at timestamptz not null
);
create index if not exists cms_rate_limits_expiry on public.cms_rate_limits(expires_at);
alter table public.cms_rate_limits enable row level security;
revoke all on public.cms_rate_limits from anon, authenticated;
grant all on public.cms_rate_limits to service_role;

create or replace function public.cms_patch_record(record_key text, patch jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  update cms_records set value=value || patch, updated_at=now() where key=record_key;
  return found;
end;
$$;
revoke all on function public.cms_patch_record(text,jsonb) from public, anon, authenticated;
grant execute on function public.cms_patch_record(text,jsonb) to service_role;

create or replace function public.cms_rate_limit(rate_key text, max_hits integer, window_seconds integer, consume boolean)
returns boolean language plpgsql security definer set search_path=public as $$
declare current_hits integer;
begin
  if not consume then
    select hits into current_hits from cms_rate_limits where key=rate_key and expires_at>now();
    return coalesce(current_hits,0)<max_hits;
  end if;
  delete from cms_rate_limits where expires_at<=now();
  insert into cms_rate_limits(key,hits,expires_at) values(rate_key,1,now()+make_interval(secs=>window_seconds))
  on conflict(key) do update set hits=cms_rate_limits.hits+1
  returning hits into current_hits;
  return current_hits<=max_hits;
end;
$$;
revoke all on function public.cms_rate_limit(text,integer,integer,boolean) from public, anon, authenticated;
grant execute on function public.cms_rate_limit(text,integer,integer,boolean) to service_role;

-- Public product media only. No anonymous upload policies are installed.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('site-media','site-media',true,10000000,array['image/jpeg','image/png','image/gif','image/webp','image/avif','application/pdf'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
