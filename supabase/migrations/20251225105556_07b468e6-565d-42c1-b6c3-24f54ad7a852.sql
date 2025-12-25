-- Create storage bucket for guest images
INSERT INTO storage.buckets (id, name, public) VALUES ('guest-images', 'guest-images', true);

-- Allow public to view guest images
CREATE POLICY "Public can view guest images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'guest-images');

-- Allow authenticated users to upload guest images
CREATE POLICY "Authenticated users can upload guest images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'guest-images');

-- Allow admins to delete guest images
CREATE POLICY "Admins can delete guest images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'guest-images' AND public.has_role(auth.uid(), 'admin'));