-- Add images column (array of URLs)
ALTER TABLE spots ADD COLUMN images text[] NOT NULL DEFAULT '{}';

-- RPC function: any authenticated user can append photos to public spots (or their own spots)
-- Uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION add_spot_photos(spot_id uuid, new_urls text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE spots
  SET images = images || new_urls
  WHERE id = spot_id
    AND (is_public = true OR user_id = auth.uid());
END;
$$;

-- Storage bucket for spot images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('spot-images', 'spot-images', true, 5242880, '{image/jpeg,image/png,image/webp,image/heic}')
ON CONFLICT (id) DO NOTHING;

-- Any authenticated user can upload to spot-images
CREATE POLICY "Authenticated users can upload spot images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'spot-images');

-- Anyone can view spot images (public bucket)
CREATE POLICY "Public can view spot images" ON storage.objects
  FOR SELECT USING (bucket_id = 'spot-images');

-- Users can delete their own uploads
CREATE POLICY "Users can delete own spot images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'spot-images' AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM spots WHERE user_id = auth.uid()
  ));
