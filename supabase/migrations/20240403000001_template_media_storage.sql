-- ============================================
-- Template Editor: Media Storage
-- ============================================

-- Create a bucket for template media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'template-media',
    'template-media',
    true, -- Set to true so media is publicly accessible in documents
    5242880, -- 5MB limit
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for template-media bucket
-- Note: 'public' bucket allows anyone to READ if they have the URL, 
-- but we still need policies for INSERT/UPDATE/DELETE.

CREATE POLICY "Allow public read access to template-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'template-media');

CREATE POLICY "Allow authenticated users to upload template-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'template-media'
  -- Optional: Restrict to user's folder if needed, but for templates
  -- we'll keep it simple for now or use account_id in path
);

CREATE POLICY "Allow users to delete their own template-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'template-media');
