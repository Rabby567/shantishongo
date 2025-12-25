-- Add policy for profile insertion via trigger
CREATE POLICY "Allow trigger to insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (true);

-- Also allow service role operations
CREATE POLICY "Service role can do anything on profiles"
    ON public.profiles FOR ALL
    USING (true)
    WITH CHECK (true);