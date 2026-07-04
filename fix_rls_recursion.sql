-- =========================================================================
-- FIX: Supabase RLS Infinite Recursion & Slow Loading Time
-- Run this script inside your Supabase Console SQL Editor
-- Project ref: snqsgqdovqrjsikcbaia
-- =========================================================================

-- 1. Create a SECURITY DEFINER helper function.
-- This function runs with the privileges of the postgres creator role,
-- bypassing RLS checks to safely verify company roles without causing recursion.
create or replace function public.has_company_role(co_id uuid, u_id uuid, roles public.company_role[])
returns boolean as $$
  select exists (
    select 1
    from public.company_members
    where company_id = co_id
      and user_id = u_id
      and role = any(roles)
  );
$$ language sql security definer;

-- 2. Drop the old recursive policies that were causing stack overflow timeouts
drop policy if exists "Members read own membership rows" on company_members;
drop policy if exists "Owners and managers manage members" on company_members;
drop policy if exists "Owners and managers manage invites" on company_invites;
drop policy if exists "Owners and managers modify categories" on categories;
drop policy if exists "Owners and managers modify products" on products;
drop policy if exists "Owners and managers update company" on companies;

-- 3. Recreate the RLS policies using the has_company_role function
-- company_members RLS Policies
create policy "Members read own membership rows" on company_members
  for select using (
    user_id = auth.uid()
    or public.has_company_role(company_id, auth.uid(), array['owner', 'manager', 'staff']::public.company_role[])
  );

create policy "Owners and managers manage members" on company_members
  for all using (
    public.has_company_role(company_id, auth.uid(), array['owner', 'manager']::public.company_role[])
  );

-- company_invites RLS Policies
create policy "Owners and managers manage invites" on company_invites
  for all using (
    public.has_company_role(company_id, auth.uid(), array['owner', 'manager']::public.company_role[])
  );

-- categories RLS Policies
create policy "Owners and managers modify categories" on categories
  for all using (
    public.has_company_role(company_id, auth.uid(), array['owner', 'manager']::public.company_role[])
  );

-- products RLS Policies
create policy "Owners and managers modify products" on products
  for all using (
    public.has_company_role(company_id, auth.uid(), array['owner', 'manager']::public.company_role[])
  );

-- companies RLS Policies
create policy "Owners and managers update company" on companies
  for update using (
    public.has_company_role(id, auth.uid(), array['owner', 'manager']::public.company_role[])
  );
