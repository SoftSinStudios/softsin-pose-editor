# Board image endpoint deployment

Upload `board-upload.php` and `.htaccess` directly into the InterServer `/website-images/` directory. Do not upload this README or any FTP credentials.

After deployment:

1. Delete the temporary `php-test.php` file.
2. Open `https://files.softsinstudios.com/website-images/board-upload.php` directly. A JSON `Method not allowed` response is expected because browser navigation uses GET while the endpoint only accepts authenticated POST requests.
3. Sign into the local or production board and upload a supported image under 10 MB.
4. Confirm the image is stored under `/website-images/board/{user-uuid}/` with a filename such as `forum-name_20260916-223945_a81f03c2.webp`.
5. Confirm the inserted image loads in the post and unsupported or oversized files are rejected.

The UUID directory is the authoritative account identifier. The sanitized forum name in the filename is a human-readable moderation aid and may change when a member updates their display name.
