begin;
do $$
declare r integer; c integer; sid uuid; result jsonb; n integer;
begin
 for r in 0..8 loop
  for c in 1..9 loop
   insert into public.topview_sessions(name,token_hash,ip_hash) values('rollback-check','test','test') returning id into sid;
   result:=public.topview_answer(sid,'test',r,c);
   if (result->>'correct')::boolean is distinct from (c=r+1) then raise exception 'Incorrect mapping: row %, card %',r,c; end if;
   select cardinality(solved) into n from public.topview_sessions where id=sid;
   if n<>(case when c=r+1 then 1 else 0 end) then raise exception 'Unexpected progress'; end if;
  end loop;
 end loop;
 insert into public.topview_sessions(name,token_hash,ip_hash) values('rollback-complete','test','test') returning id into sid;
 for r in 0..8 loop result:=public.topview_answer(sid,'test',r,r+1); end loop;
 if not (result->>'complete')::boolean or jsonb_array_length(result->'solved')<>9 then raise exception 'Completion failed'; end if;
 if (select count(*) from jsonb_each(result->'placed'))<>9 then raise exception 'Placement failed'; end if;
end $$;
rollback;
