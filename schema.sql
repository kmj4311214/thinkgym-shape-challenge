create table public.shape7_sessions (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null,
 name text not null check (char_length(name) between 1 and 20),
 ip_hash text not null,
 started_at timestamptz not null default clock_timestamp(),
 stage integer not null default 0 check(stage between 0 and 3),
 solved integer[] not null default '{}',
 completed_at timestamptz,
 elapsed_ms integer,
 check (elapsed_ms is null or elapsed_ms >= 0)
);
alter table public.shape7_sessions enable row level security;
revoke all on public.shape7_sessions from anon, authenticated;
grant all on public.shape7_sessions to service_role;
create index shape7_completed_rank on public.shape7_sessions(elapsed_ms,completed_at) where completed_at is not null;
create index shape7_start_rate on public.shape7_sessions(ip_hash,started_at);
create function public.shape7_answer(p_id uuid,p_hash text,p_stage integer,p_row integer,p_card integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.shape7_sessions; expected integer[][] := array[[1,2,3,4,5],[11,12,13,14,15],[16,17,18,19,20],[6,7,8,9,10]]; r bigint;
begin
 select * into s from public.shape7_sessions where id=p_id and token_hash=p_hash for update;
 if not found then raise exception 'Invalid session'; end if;
 if s.completed_at is not null then
  select 1+count(*) into r from public.shape7_sessions where completed_at is not null and elapsed_ms<s.elapsed_ms;
  return jsonb_build_object('complete',true,'elapsed_ms',s.elapsed_ms,'rank',r,'solved',s.solved);
 end if;
 if clock_timestamp()-s.started_at>interval '24 hours' then raise exception 'Session expired'; end if;
 if p_stage=s.stage-1 and p_row between 0 and 4 and p_card=expected[p_stage+1][p_row+1] then
  return jsonb_build_object('solved',array[0,1,2,3,4],'nextStage',s.stage);
 end if;
 if p_stage<>s.stage or p_row not between 0 and 4 or p_card is distinct from expected[s.stage+1][p_row+1] then raise exception 'Incorrect answer'; end if;
 if not p_row=any(s.solved) then s.solved=array_append(s.solved,p_row); end if;
 if cardinality(s.solved)=5 and s.stage=3 then
  s.completed_at=clock_timestamp();
  s.elapsed_ms=floor(extract(epoch from(s.completed_at-s.started_at)))::integer*1000;
  update public.shape7_sessions set solved=s.solved,completed_at=s.completed_at,elapsed_ms=s.elapsed_ms where id=s.id;
  select 1+count(*) into r from public.shape7_sessions where completed_at is not null and elapsed_ms<s.elapsed_ms;
  return jsonb_build_object('complete',true,'elapsed_ms',s.elapsed_ms,'rank',r,'solved',s.solved);
 elsif cardinality(s.solved)=5 then
  update public.shape7_sessions set stage=stage+1,solved='{}' where id=s.id;
  return jsonb_build_object('solved',s.solved,'nextStage',s.stage+1);
 end if;
 update public.shape7_sessions set solved=s.solved where id=s.id;
 return jsonb_build_object('solved',s.solved);
end $$;
revoke all on function public.shape7_answer(uuid,text,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.shape7_answer(uuid,text,integer,integer,integer) to service_role;
create function public.shape7_leaderboard() returns jsonb language sql security invoker set search_path='' as $$
select jsonb_build_object('rows',coalesce((select jsonb_agg(r) from (select id,name,elapsed_ms,completed_at,rank() over(order by elapsed_ms) as rank from public.shape7_sessions where completed_at is not null order by elapsed_ms,completed_at limit 100) r),'[]'::jsonb),'total',(select count(*) from public.shape7_sessions where completed_at is not null));
$$;
revoke all on function public.shape7_leaderboard() from public,anon,authenticated;
grant execute on function public.shape7_leaderboard() to service_role;

create function public.shape7_shuffle_cards()
returns integer[] language sql volatile security invoker set search_path='' as $$
 select array_agg(n order by pg_catalog.random()) from pg_catalog.generate_series(1,20) as n;
$$;
revoke all on function public.shape7_shuffle_cards() from public,anon,authenticated;
grant execute on function public.shape7_shuffle_cards() to service_role;
alter table public.shape7_sessions add column card_order integer[] not null default public.shape7_shuffle_cards();
