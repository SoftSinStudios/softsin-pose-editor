# SoftSin Studios Site Architecture

## Purpose

The site uses Astro to generate static HTML. Astro owns shared site structure; each interactive tool remains an isolated vanilla HTML/CSS/JavaScript application until that tool receives its own deliberate redesign.

## Ownership boundaries

Shared website code owns:

- metadata and document structure
- theme tokens and typography
- header, navigation, and footer
- generic layout, buttons, panels, and cards
- common responsive behavior

Individual tool code owns:

- tool workspace layout and controls
- tool state and behavior
- tool-specific CSS and JavaScript
- tool-specific runtime data and project formats

Shared styles must not target tool-specific IDs or implementation classes. Tool styles must only be loaded by the page that owns them and must not redefine shared theme tokens.

## Directories

- `src/layouts/`: shared document and page shells
- `src/components/`: reusable site components
- `src/styles/`: shared theme and component layers
- `src/pages/`: route entry points; pages build to existing `.html` URLs
- `public/css/`: unchanged tool-specific styles during Phase 1
- `public/js/`: unchanged tool JavaScript during Phase 1
- `public/data/`: browser-fetched runtime data
- `public/images/`: static image assets

## URL contract

Astro is configured with `build.format: "file"` and `trailingSlash: "never"`. Existing routes such as `/pose.html`, `/musicprompt.html`, and `/toolhub.html` are public contracts and must remain valid unless a separately approved migration introduces redirects.

## Phase 1 restrictions

- Do not redesign the existing theme.
- Do not rewrite tool internals or add tool features.
- Do not introduce React, Vue, or another UI framework.
- Do not change saved project or export formats.
- Do not change authentication or backend behavior.
- Do not delete legacy data until its consumers have been verified.

## Validation

Every migration must pass `npm run build`. Interactive tools must additionally be behavior-tested before their original page is retired.
