-- Setup consolidated user positions per property
-- Run this in your Supabase SQL editor

-- 1) Table to store per-user, per-property position snapshot
create table if not exists user_property_positions (
  user_id uuid references user_profiles(user_id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  shares numeric not null default 0,
  avg_price numeric not null default 0,
  cost_basis numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

-- 2) RLS policies: users can read their own positions
alter table user_property_positions enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_property_positions' and policyname = 'Users can read own positions'
  ) then
    create policy "Users can read own positions" on user_property_positions for select
    using ( auth.uid()::text = user_id::text );
  end if;
end $$;

-- 3) Recalc function: derive position from confirmed investments
create or replace function recalc_user_property_position(p_user_id uuid, p_property_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_shares numeric := 0;
  v_cost numeric := 0;
  v_avg numeric := 0;
begin
  -- derive from confirmed investments
  select coalesce(sum(shares_owned),0), coalesce(sum(total_investment),0)
    into v_shares, v_cost
  from investments
  where user_id = p_user_id
    and property_id = p_property_id
    and investment_status = 'confirmed';

  if v_shares > 0 then
    v_avg := v_cost / v_shares;
  else
    v_avg := 0;
    v_cost := 0;
  end if;

  insert into user_property_positions (user_id, property_id, shares, avg_price, cost_basis, updated_at)
  values (p_user_id, p_property_id, v_shares, v_avg, v_cost, now())
  on conflict (user_id, property_id)
  do update set shares = excluded.shares,
                avg_price = excluded.avg_price,
                cost_basis = excluded.cost_basis,
                updated_at = now();
end $$;

-- 4) Convenience function: recalc all positions for a user
create or replace function recalc_all_positions_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare r record;
begin
  for r in (
    select distinct property_id from investments where user_id = p_user_id and property_id is not null
  ) loop
    perform recalc_user_property_position(p_user_id, r.property_id);
  end loop;
end $$;

-- 5) Trigger on investments to keep snapshot fresh (create wrapper if missing, then attach trigger)

-- create wrapper if missing (handles new/old row variants)
create or replace function fn_investments_recalc_position_wrapper()
returns trigger
language plpgsql
security definer as $$
declare
  v_user uuid;
  v_property uuid;
begin
  v_user := coalesce(new.user_id, old.user_id);
  v_property := coalesce(new.property_id, old.property_id);
  if v_user is not null and v_property is not null then
    perform recalc_user_property_position(v_user, v_property);
  end if;
  return coalesce(new, old);
end $$;

-- Attach the trigger to use the wrapper
drop trigger if exists trg_recalc_position on investments;
create trigger trg_recalc_position
after insert or update or delete on investments
for each row execute procedure fn_investments_recalc_position_wrapper();

-- 6) Convenience view including current value and P&L using properties.share_price
create or replace view user_property_positions_with_value as
select 
  upp.user_id,
  upp.property_id,
  upp.shares,
  upp.avg_price,
  upp.cost_basis,
  upp.updated_at,
  p.share_price as current_share_price,
  (upp.shares * p.share_price) as current_value,
  ((p.share_price - upp.avg_price) * upp.shares) as pnl
from user_property_positions upp
join properties p on p.id = upp.property_id;

-- To verify after running: select * from user_property_positions where user_id = auth.uid();
