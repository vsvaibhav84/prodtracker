
-- Convert update_updated_at_column to SECURITY INVOKER (no elevated privilege needed)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Add length constraint on profiles.display_name as defense-in-depth
ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_name_length CHECK (char_length(display_name) <= 100);
