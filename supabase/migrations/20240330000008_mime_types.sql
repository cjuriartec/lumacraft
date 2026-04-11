-- Create mime_types table
CREATE TABLE IF NOT EXISTS public.mime_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    value TEXT NOT NULL UNIQUE,
    extension TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with common MIME types
INSERT INTO public.mime_types (label, value, extension, category) VALUES
('JPEG Image', 'image/jpeg', 'jpg', 'image'),
('PNG Image', 'image/png', 'png', 'image'),
('GIF Image', 'image/gif', 'gif', 'image'),
('WebP Image', 'image/webp', 'webp', 'image'),
('SVG Vector', 'image/svg+xml', 'svg', 'image'),
('PDF Document', 'application/pdf', 'pdf', 'document'),
('Word Document (Classic)', 'application/msword', 'doc', 'document'),
('CSV Spreadsheet', 'text/csv', 'csv', 'document'),
('JSON Data', 'application/json', 'json', 'document'),
('Plain Text', 'text/plain', 'txt', 'document'),
('MP4 Video', 'video/mp4', 'mp4', 'video'),
('MP3 Audio', 'audio/mpeg', 'mp3', 'audio')
ON CONFLICT (value) DO NOTHING;

-- RLS
ALTER TABLE public.mime_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read mime_types" ON public.mime_types FOR SELECT USING (true);
