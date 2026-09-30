create table if not exists public.thinkgym_admin_credentials (
 username text primary key, salt text not null, password_hash text not null
);
create table if not exists public.thinkgym_admin_sessions (
 token_hash text primary key, expires_at timestamptz not null
);
create table if not exists public.thinkgym_admin_attempts (
 ip_hash text primary key, window_start timestamptz not null, attempts integer not null
);
alter table public.thinkgym_admin_credentials enable row level security;
alter table public.thinkgym_admin_sessions enable row level security;
alter table public.thinkgym_admin_attempts enable row level security;
revoke all on public.thinkgym_admin_credentials, public.thinkgym_admin_sessions, public.thinkgym_admin_attempts from public, anon, authenticated;
grant all on public.thinkgym_admin_credentials, public.thinkgym_admin_sessions, public.thinkgym_admin_attempts to service_role;

create or replace function public.thinkgym_admin_attempt(p_ip text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 insert into public.thinkgym_admin_attempts as a values(p_ip,clock_timestamp(),1)
 on conflict(ip_hash) do update set
 attempts=case when a.window_start < clock_timestamp()-interval '15 minutes' then 1 else a.attempts+1 end,
 window_start=case when a.window_start < clock_timestamp()-interval '15 minutes' then clock_timestamp() else a.window_start end
 returning attempts into n;
 delete from public.thinkgym_admin_sessions where expires_at < clock_timestamp();
 delete from public.thinkgym_admin_attempts where window_start < clock_timestamp()-interval '1 day';
 return n<=10;
end $$;

create or replace function public.thinkgym_admin_reset(p_before timestamptz) returns integer
language plpgsql security invoker set search_path='' as $$
declare n integer; total integer:=0;
begin
 if p_before is null or p_before>clock_timestamp() then raise exception 'Invalid cutoff'; end if;
 delete from public.pumpkin_sessions where completed_at<=p_before; get diagnostics n=row_count; total:=total+n;
 delete from public.rings_sessions where completed_at<=p_before; get diagnostics n=row_count; total:=total+n;
 delete from public.shape7_sessions where completed_at<=p_before; get diagnostics n=row_count; total:=total+n;
 delete from public.upper_v2_sessions where completed_at<=p_before; get diagnostics n=row_count; total:=total+n;
 delete from public.packing_sessions where completed_at<=p_before; get diagnostics n=row_count; total:=total+n;
 delete from public.layers_sessions where completed_at<=p_before; get diagnostics n=row_count; total:=total+n;
 return total;
end $$;
revoke all on function public.thinkgym_admin_attempt(text),public.thinkgym_admin_reset(timestamptz) from public,anon,authenticated;
grant execute on function public.thinkgym_admin_attempt(text),public.thinkgym_admin_reset(timestamptz) to service_role;

create or replace function public.thinkgym_admin_list(p_program text,p_offset integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare target text; result jsonb;
begin
 target:=case p_program when 'pumpkin' then 'pumpkin_sessions' when 'rings' then 'rings_sessions' when 'shape7' then 'shape7_sessions' when 'upper' then 'upper_v2_sessions' when 'packing' then 'packing_sessions' when 'layers' then 'layers_sessions' end;
 if target is null or p_offset<0 or p_offset>100000 then raise exception 'Invalid program'; end if;
 execute format('select coalesce(jsonb_agg(r),''[]''::jsonb) from (select id,name,elapsed_ms,completed_at,rank() over(order by elapsed_ms) as rank from public.%I where completed_at is not null order by elapsed_ms,completed_at,id limit 50 offset $1) r',target) into result using p_offset;
 return result;
end $$;
revoke all on function public.thinkgym_admin_list(text,integer) from public,anon,authenticated;
grant execute on function public.thinkgym_admin_list(text,integer) to service_role;
