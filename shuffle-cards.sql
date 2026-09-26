create function public.shape7_shuffle_cards()
returns integer[] language sql volatile security invoker set search_path='' as $$
 select array_agg(n order by pg_catalog.random()) from pg_catalog.generate_series(1,20) as n;
$$;
revoke all on function public.shape7_shuffle_cards() from public,anon,authenticated;
grant execute on function public.shape7_shuffle_cards() to service_role;
alter table public.shape7_sessions add column card_order integer[] not null default public.shape7_shuffle_cards();
