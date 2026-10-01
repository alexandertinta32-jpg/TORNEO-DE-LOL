-- Ejecuta este script en el SQL Editor del proyecto Supabase.
-- Los videos son públicos para ver; subir y borrar requiere iniciar sesión.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'torneo-clips',
  'torneo-clips',
  true,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view tournament clips" on storage.objects;
create policy "Public can view tournament clips"
on storage.objects for select to anon, authenticated
using (bucket_id = 'torneo-clips');

drop policy if exists "Signed-in organizer can upload tournament clips" on storage.objects;
create policy "Signed-in organizer can upload tournament clips"
on storage.objects for insert to authenticated
with check (bucket_id = 'torneo-clips');

drop policy if exists "Signed-in organizer can delete tournament clips" on storage.objects;
create policy "Signed-in organizer can delete tournament clips"
on storage.objects for delete to authenticated
using (bucket_id = 'torneo-clips');
