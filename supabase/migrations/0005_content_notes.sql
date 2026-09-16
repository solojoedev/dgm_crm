alter table public.content_items add column if not exists note text;

update public.content_items
set note = 'Can we use the brighter version? The lighting feels a little dark.'
where caption = 'Live music Saturday flyer' and note is null;
