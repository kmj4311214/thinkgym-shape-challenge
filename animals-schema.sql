create function public.animals_shuffle() returns integer[] language sql volatile security invoker set search_path='' as $$
 select array_agg(n order by pg_catalog.random()) from pg_catalog.generate_series(1,8) n;
$$;
revoke all on function public.animals_shuffle() from public,anon,authenticated;
grant execute on function public.animals_shuffle() to service_role;
create table public.animals_sessions(
 id uuid primary key default gen_random_uuid(),token_hash text not null,name text not null check(char_length(name) between 1 and 20),
 ip_hash text not null,started_at timestamptz not null default clock_timestamp(),
 solved integer[] not null default '{}',card_order integer[] not null default public.animals_shuffle(),
 completed_at timestamptz,elapsed_ms integer check(elapsed_ms>=0)
);
alter table public.animals_sessions enable row level security;
revoke all on public.animals_sessions from anon,authenticated;
grant all on public.animals_sessions to service_role;
create index animals_completed_rank on public.animals_sessions(elapsed_ms,completed_at) where completed_at is not null;
create index animals_start_rate on public.animals_sessions(ip_hash,started_at);
create function public.animals_answer(p_id uuid,p_hash text,p_row integer,p_card integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.animals_sessions; r bigint;
begin
 select * into s from public.animals_sessions where id=p_id and token_hash=p_hash for update;
 if not found then raise exception 'Invalid session'; end if;
 if s.completed_at is null then
  if clock_timestamp()-s.started_at>interval '24 hours' then raise exception 'Session expired'; end if;
  if p_row is null or p_row not between 0 and 7 or p_card is distinct from (array[1,2,5,6,3,7,4,8])[p_row+1] then return jsonb_build_object('correct',false); end if;
  if not p_row=any(s.solved) then s.solved=array_append(s.solved,p_row); end if;
  if cardinality(s.solved)=8 then
   s.completed_at=clock_timestamp();
   s.elapsed_ms=floor(extract(epoch from(s.completed_at-s.started_at)))::integer*1000;
  end if;
  update public.animals_sessions set solved=s.solved,completed_at=s.completed_at,elapsed_ms=s.elapsed_ms where id=s.id;
 end if;
 if s.completed_at is not null then
  select 1+count(*) into r from public.animals_sessions where completed_at is not null and elapsed_ms<s.elapsed_ms;
 end if;
 return jsonb_build_object('correct',true,'placed',(select coalesce(jsonb_object_agg(n,(array[1,2,5,6,3,7,4,8])[n+1]),'{}'::jsonb) from unnest(s.solved) n),'complete',s.completed_at is not null,'solved',s.solved,'elapsed_ms',s.elapsed_ms,'rank',r);
end $$;
revoke all on function public.animals_answer(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.animals_answer(uuid,text,integer,integer) to service_role;
create function public.animals_leaderboard() returns jsonb language sql security invoker set search_path='' as $$
select jsonb_build_object('rows',coalesce((select jsonb_agg(r) from (select id,name,elapsed_ms,completed_at,rank() over(order by elapsed_ms) as rank from public.animals_sessions where completed_at is not null order by elapsed_ms,completed_at limit 100) r),'[]'::jsonb),'total',(select count(*) from public.animals_sessions where completed_at is not null));
$$;
revoke all on function public.animals_leaderboard() from public,anon,authenticated;
grant execute on function public.animals_leaderboard() to service_role;
