-- Step 1: Drop old foreign key constraints and tables related to 'roles'
ALTER TABLE public.personnel DROP CONSTRAINT IF EXISTS personnel_role_id_fkey;
DROP TABLE IF EXISTS public.role_permissions;
DROP TABLE IF EXISTS public.roles;

-- Step 2: Drop the now-unused role_id column from personnel
ALTER TABLE public.personnel DROP COLUMN IF EXISTS role_id;

-- Step 3: Create the new position_permissions join table
CREATE TABLE IF NOT EXISTS public.position_permissions (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE (position_id, permission_id)
);
COMMENT ON TABLE public.position_permissions IS 'Maps permissions to positions, forming the core of the RBAC system.';

-- Step 4: Add position_id to the personnel table and populate it
ALTER TABLE public.personnel
ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL;

UPDATE public.personnel p
SET position_id = (SELECT id FROM public.positions pos WHERE pos.name = p.position)
WHERE p.position_id IS NULL;

-- Step 5: Grant all permissions to the 'BOD' position by default
INSERT INTO public.position_permissions (position_id, permission_id)
SELECT
  (SELECT id FROM public.positions WHERE name = 'BOD'),
  p.id
FROM public.permissions p
ON CONFLICT (position_id, permission_id) DO NOTHING;

-- Step 6: Update the trigger function to use position_id
CREATE OR REPLACE FUNCTION public.handle_new_personnel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  pos_id UUID;
  pos_name TEXT;
BEGIN
  -- Get position_id from metadata and find the corresponding name
  pos_id := (new.raw_user_meta_data ->> 'position_id')::UUID;
  SELECT name INTO pos_name FROM public.positions WHERE id = pos_id;

  INSERT INTO public.personnel (id, email, name, position, position_id, role, status)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    pos_name, -- The text name of the position
    pos_id,   -- The UUID of the position
    (new.raw_user_meta_data ->> 'role')::text,
    (new.raw_user_meta_data ->> 'status')::text
  );
  RETURN new;
END;
$$;