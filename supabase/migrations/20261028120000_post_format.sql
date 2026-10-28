-- What kind of post a "video" in the content plan is: a video, a photo or a carousel. Everything planned so far
-- was a video. Shown as a coloured tag next to the content type, so a photo post doesn't pass for a video.
alter table public.tasks add column format text not null default 'video' check (format in ('video', 'photo', 'carousel'));
