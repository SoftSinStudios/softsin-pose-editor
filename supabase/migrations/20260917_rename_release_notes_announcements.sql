-- Keep the established slug so existing links continue to work while updating the public channel name.

update public.categories
set
  name = 'Announcements',
  description = 'Official announcements, releases, and important updates.'
where slug = 'release-notes';
