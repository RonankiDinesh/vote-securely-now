-- Fix function search path for generate_ballot_token
CREATE OR REPLACE FUNCTION public.generate_ballot_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN 'VT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 12));
END;
$$;