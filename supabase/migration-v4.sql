-- Migration v4: Gender, chronic medication, and route ordering updates
-- Run this in Supabase SQL Editor

-- 1. Add gender column (male/female)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gender text
  CHECK (gender IN ('male', 'female'));

-- 2. Add chronic medication flag
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS takes_chronic_medication boolean;

-- Notes:
-- • Both columns are nullable — existing users will have NULL until they
--   complete the updated ComponentSelector flow.
-- • 'el_incendio' module: create a new module in admin panel with
--   component_key = 'el_incendio' and title = 'El incendio que vamos a apagar'.
--   It will automatically appear as the 2nd fixed module in every patient's route.
-- • 'control_peso' module: create a module with component_key = 'control_peso'
--   so patients who select 'Control del peso' as a priority get that module.
-- • Existing patients who already completed ComponentSelector will have
--   has_selected_components = true and will NOT see the selector again.
--   They will have gender = NULL and takes_chronic_medication = NULL, so
--   adherencia and salud_sexual will be excluded from their route until
--   they re-select (which they won't be prompted to do). This is intentional.
