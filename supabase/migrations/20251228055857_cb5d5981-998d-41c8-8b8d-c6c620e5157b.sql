-- Allow approved moderators to view attendance records
CREATE POLICY "Approved moderators can view attendance"
ON public.attendance
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'moderator'::app_role) AND is_moderator_approved(auth.uid()))
);