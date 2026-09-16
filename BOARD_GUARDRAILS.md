# Message Board Editor and Guardrails

The board uses a capable Markdown editor for signed-in members and enforces abuse controls at the Supabase boundary. Browser controls improve the experience; they are not treated as security.

## Member editor

- Bold and italic text
- Section headings
- Inline and fenced code
- Quotes, ordered lists, and unordered lists
- Dividers
- HTTP/HTTPS links
- Managed PNG, JPEG, WebP, and GIF uploads to `files.softsinstudios.com`
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

Run `supabase/migrations/20260916_board_guardrails.sql` in the Supabase SQL Editor for database posting limits. Then deploy `server/files/board-upload.php` and `server/files/.htaccess` into `/website-images/` on the file server.

The PHP endpoint:

1. Accepts requests only from the production site and approved local development origins.
2. Verifies the Supabase bearer session directly with Supabase Auth.
3. Validates the actual file MIME type, image structure, dimensions, and 10 MB limit.
4. Limits each member to 20 image uploads per hour.
5. Stores images under the immutable account UUID and prefixes each randomized filename with the member's current sanitized forum name and UTC upload time.

Example: `/website-images/board/{user-id}/david-polensky_20260916-223945_a81f03c2.webp`. The UUID directory is the authoritative identity because display names can change.

The Supabase migration:

1. Adds server-side identity, content, link, image, and posting-cadence validation.
2. Also creates the earlier Supabase `board-images` fallback bucket. It can be removed after the InterServer endpoint has passed production testing.

The migration is additive to the existing board schema. Test it against the current Supabase project before deploying the updated frontend to production.

## Rendering safety

Posts are stored as Markdown text. Rendering escapes HTML before applying the supported Markdown subset. Links accept HTTP/HTTPS syntax and render with `ugc`, `nofollow`, `noopener`, and `noreferrer` relationship protections.
