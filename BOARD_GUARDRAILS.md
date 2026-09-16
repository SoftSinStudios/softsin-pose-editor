# Message Board Editor and Guardrails

The board uses a capable Markdown editor for signed-in members and enforces abuse controls at the Supabase boundary. Browser controls improve the experience; they are not treated as security.

## Member editor

- Bold and italic text
- Section headings
- Inline and fenced code
- Quotes, ordered lists, and unordered lists
- Dividers
- HTTP/HTTPS links
- Managed PNG, JPEG, WebP, and GIF uploads
- Live preview
- Local per-thread and per-channel draft recovery

## Limits

- Thread titles: 3–140 characters
- Post bodies: 1–20,000 characters
- Images: 5 MB each, 4 per post
- Links: 10 per post; new accounts are limited to 2 during their first 24 hours
- Members: 60 seconds between new threads, maximum 5 threads per hour
- Members: 15 seconds between replies, maximum 30 replies per hour
- Moderators and administrators are exempt from cadence limits, but not content-size limits

## Deployment

Run `supabase/migrations/20260916_board_guardrails.sql` in the Supabase SQL Editor. It:

1. Creates or updates the public `board-images` bucket.
2. Restricts uploads and deletion to each authenticated member's own folder.
3. Adds server-side identity, content, link, image, and posting-cadence validation.

The migration is additive to the existing board schema. Test it against the current Supabase project before deploying the updated frontend to production.

## Rendering safety

Posts are stored as Markdown text. Rendering escapes HTML before applying the supported Markdown subset. Links accept HTTP/HTTPS syntax and render with `ugc`, `nofollow`, `noopener`, and `noreferrer` relationship protections.
