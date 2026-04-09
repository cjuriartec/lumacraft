-- Crear bucket privado para las exportaciones
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exports',
  'exports',
  false, -- Privado, solo accesible vía Signed URLs
  10485760, -- 10MB limit
  '{"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}'
) on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Políticas de seguridad (Solo usuarios autenticados pueden descargar y solo admins/service pueden insertar)

create policy "Authenticated users can read exports"
  on storage.objects for select
  to authenticated
  using ( bucket_id = 'exports' );

create policy "Service role can orchestrate exports"
  on storage.objects for all
  to service_role
  using ( bucket_id = 'exports' );
