-- Create public avatars bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true, -- Public for world-readability
  5242880, -- 5MB limit
  '{"image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"}'
) on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Security Policies
-- 1. Anyone can view avatars (Bucket is public, but let's be explicit)
create policy "Anyone can view avatars"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- 2. Authenticated users can upload to their own folder
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check ( 
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text 
  );

-- 3. Authenticated users can update their own avatar
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using ( 
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text 
  );

-- 4. Authenticated users can delete their own avatar
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using ( 
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text 
  );
