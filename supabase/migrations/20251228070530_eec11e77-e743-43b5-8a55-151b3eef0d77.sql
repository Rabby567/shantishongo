-- Allow users to insert their own moderator role during registration
CREATE POLICY "Users can insert their own moderator role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'moderator'::app_role
);