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
- Images: 10 MB each, 4 per post
- Links: 10 per post; new accounts are limited to 2 during their first 24 hours
- Members: 60 seconds between new threads, maximum 5 threads per hour
- Members: 15 seconds between replies, maximum 30 replies per hour
- Moderators and administrators are exempt from cadence limits, but not content-size limits

## Deployment

Run `supabase/migrations/20260916_board_guardrails.sql` in the Supabase SQL Editor for database posting limits. For tracked uploads, also run `supabase/migrations/20260917_board_upload_registry.sql`. Then deploy `server/files/board-upload.php`, `server/files/board-cleanup.php`, and `server/files/.htaccess` into `/website-images/` on the file server.

The PHP endpoint:

1. Accepts requests only from the production site and approved local development origins.
2. Verifies the Supabase bearer session directly with Supabase Auth.
3. Validates the actual file MIME type, image structure, dimensions, and 10 MB limit.
4. Limits each member to 20 image uploads per hour while exempting server-verified administrators.
5. Stores images under the immutable account UUID and prefixes each randomized filename with the member's current sanitized forum name and UTC upload time.
6. Registers every accepted file before returning success; registration failure removes the file immediately.

Example: `/website-images/board/{user-id}/david-polensky_20260916-223945_a81f03c2.webp`. The UUID directory is the authoritative identity because display names can change.

The Supabase migration:

1. Adds server-side identity, content, link, image, and posting-cadence validation.
2. Also creates the earlier Supabase `board-images` fallback bucket. It can be removed after the InterServer endpoint has passed production testing.

The upload-registry migration records ownership, size, path, and lifecycle state. Image URLs still present when a thread or reply is saved are attached to that content. Unattached uploads receive a 24-hour grace period, then appear in the administrator Community Health panel. Cleanup only accepts a verified administrator session and only removes registry-confirmed pending files beneath the board upload directory. Attachments belonging to live or moderated content are preserved.

## Reporting and moderation

Run `supabase/migrations/20260917_board_reporting.sql` before publishing the reporting interface. It adds:

1. Private reports for threads and replies with controlled reason codes and optional context.
2. Duplicate active-report and self-report prevention at the database boundary.
3. A staff-only moderation and board-health dashboard on the profile page with Active, Closed, and All report views. The queue is never rendered on the public board page.
4. Reviewing, resolved, and dismissed dispositions with moderator notes.
5. An immutable report-event history recording submission and every disposition change.
6. Row-level security that exposes a report only to its reporter and verified moderators or administrators.

The browser only renders controls. Supabase remains responsible for identity, permissions, target validation, and moderation history.

## User enforcement

Run `supabase/migrations/20260917_board_sanctions.sql` after the reporting migration. It adds:

1. Documented warnings that members must acknowledge.
2. Timed mutes and suspensions that make the board read-only for the affected account.
3. Timed or permanent bans.
4. Protected administrator accounts, staff hierarchy checks, and self-sanction prevention.
5. Public member-facing reasons separated from private staff notes.
6. Automatic expiration, explicit revocation, superseding of older restrictions, and immutable event history.
7. Database triggers that block restricted accounts from inserting or editing threads and replies even if browser controls are bypassed.

The staff profile dashboard owns member search, enforcement controls, and sanction history. The public board only displays the signed-in member's warning or active restriction.

The migration is additive to the existing board schema. Test it against the current Supabase project before deploying the updated frontend to production.

## Rendering safety

Posts are stored as Markdown text. Rendering escapes HTML before applying the supported Markdown subset. Links accept HTTP/HTTPS syntax and render with `ugc`, `nofollow`, `noopener`, and `noreferrer` relationship protections.

## Pagination and query limits

Run `supabase/migrations/20260917_board_pagination_indexes.sql` before production traffic grows. Channel views request 25 threads per page and thread views request 30 replies per page. Page state is preserved in the URL, channel search runs against Supabase instead of only filtering the current browser page, and direct thread links resolve independently of the current channel page. The original post remains visible above every reply page.
