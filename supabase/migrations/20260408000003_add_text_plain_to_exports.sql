-- Update allowed MIME types for the exports bucket to include text/plain
update storage.buckets
set allowed_mime_types = '{"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"}'
where id = 'exports';
