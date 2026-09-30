create table if not exists public.packing_sessions (
 id uuid primary key default gen_random_uuid(), token_hash text not null,
 name text not null check(char_length(name) between 1 and 20), ip_hash text not null,
 started_at timestamptz not null default clock_timestamp(), completed_at timestamptz,
 elapsed_ms integer check(elapsed_ms>=0), placements jsonb,
 card_order integer[] not null default array[1,2,3,4,5,6,7]
);
alter table public.packing_sessions enable row level security;
revoke all on public.packing_sessions from public,anon,authenticated;
grant all on public.packing_sessions to service_role;
create index if not exists packing_completed_rank on public.packing_sessions(elapsed_ms,completed_at) where completed_at is not null;
create index if not exists packing_start_rate on public.packing_sessions(ip_hash,started_at);
create or replace function public.packing_finish(p_id uuid,p_hash text,p_placements jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.packing_sessions; r bigint; i integer; x integer; y integer; dx integer; dy integer; pos integer; occupied integer[]:='{}'; cell jsonb;
 shapes jsonb:='[[[1,0],[0,1],[1,1],[2,1],[3,1]],[[0,0]],[[0,0],[1,0],[2,0],[0,1],[2,1]],[[2,0],[0,1],[1,1],[2,1],[0,2]],[[0,0],[0,1]],[[0,0],[1,0],[2,0],[2,1]],[[1,0],[0,1],[1,1]]]';
begin
 select * into s from public.packing_sessions where id=p_id and token_hash=p_hash for update;
 if not found then raise exception 'Invalid session'; end if;
 if s.completed_at is null then
  if clock_timestamp()-s.started_at>interval '24 hours' then raise exception 'Session expired'; end if;
  if jsonb_typeof(p_placements) is distinct from 'object' then raise exception 'Invalid placement'; end if;
  for i in 1..7 loop
   if not coalesce((p_placements->i::text->>'x') ~ '^[0-4]$',false) or not coalesce((p_placements->i::text->>'y') ~ '^[0-4]$',false) then raise exception 'Incomplete puzzle'; end if;
   x:=(p_placements->i::text->>'x')::integer; y:=(p_placements->i::text->>'y')::integer;
   for cell in select value from jsonb_array_elements(shapes->(i-1)) loop
    dx:=(cell->>0)::integer; dy:=(cell->>1)::integer; pos:=(y+dy)*5+x+dx;
    if x+dx>4 or y+dy>4 or pos=any(occupied) then raise exception 'Pieces overlap or leave board'; end if;
    occupied:=array_append(occupied,pos);
   end loop;
  end loop;
  if cardinality(occupied)<>25 then raise exception 'Incomplete puzzle'; end if;
  s.completed_at:=clock_timestamp(); s.elapsed_ms:=floor(extract(epoch from(s.completed_at-s.started_at)))::integer*1000;
  update public.packing_sessions set completed_at=s.completed_at,elapsed_ms=s.elapsed_ms,placements=p_placements where id=s.id;
 end if;
 select 1+count(*) into r from public.packing_sessions where completed_at is not null and elapsed_ms<s.elapsed_ms;
 return jsonb_build_object('complete',true,'elapsed_ms',s.elapsed_ms,'rank',r);
end $$;
create or replace function public.packing_leaderboard() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('rows',coalesce((select jsonb_agg(r) from (select id,name,elapsed_ms,completed_at,rank() over(order by elapsed_ms) as rank from public.packing_sessions where completed_at is not null order by elapsed_ms,completed_at,id limit 100) r),'[]'::jsonb),'total',(select count(*) from public.packing_sessions where completed_at is not null));
$$;
revoke all on function public.packing_finish(uuid,text,jsonb),public.packing_leaderboard() from public,anon,authenticated;
grant execute on function public.packing_finish(uuid,text,jsonb),public.packing_leaderboard() to service_role;
