# Pose Editor Workflow Overhaul

Release date: 2026-09-16  
Project format: SoftSin Pose Project 1.0.0

## Summary

The Pose Editor is now a professional, desktop-first workspace for building and refining BODY_25-compatible control poses. The release preserves the established BODY_25 topology and color convention while adding a SoftSin editing layer designed around practical image-generation workflows.

## New workflow

- A three-panel workspace separates project controls, the canvas, and bone-specific editing.
- The Anatomy Navigator provides direct bone selection and color-matched canvas previews.
- Hidden optional guides can be located and restored without cluttering the working pose.
- The selected-bone inspector centralizes curve, depth, hide, and restore actions.
- Undo, redo, zoom, Fit View, local draft recovery, and unsaved-work warnings protect active work.
- The canvas scales and remains centered across standard 1920 × 1080 and 3440 × 1440 desktop displays.

## SoftSin extensions

- Curve modifiers for supported bones
- Optional chin and tail guide bones
- Foreground and background bone depth
- Per-bone visibility controls
- Anatomy-button hover previews, including hidden-bone previews
- Adjustable global bone and joint thickness
- Editable pose metadata embedded in PNG exports
- Complete `.softpose` projects with the original reference image

## Choosing a file type

| File | Contains | Best use |
| --- | --- | --- |
| `.softpose` | Pose data, project metadata, and the original reference image | Saving work that will be reopened and refined |
| `.json` | Editable pose data without the reference image | Pose libraries, transfers, and data workflows |
| `.png` | Clean BODY_25-compatible control image plus embedded SoftSin pose data | Image-generation workflows and quick re-editing |

Reference images, editor handles, selection states, and hover glows are not rendered into exported PNG files.

## Compatibility statement

BODY_25 remains the compatibility target for the core pose topology and output colors. “SoftSin Pose Editor” identifies the product and its extended editing workflow; it does not rename or claim ownership of the underlying BODY_25 convention.

Existing supported pose JSON and SoftSin pose PNG files remain importable. New `.softpose` files supplement those formats rather than replacing them.

## Validation completed

- Save and open `.softpose` projects, including reference-image restoration
- Export and import JSON
- Export and re-import PNG pose data
- Visible and hidden bone selection
- Curve, depth, hide, and restore controls
- Anatomy hover previews for visible and hidden bones
- PNG export without reference imagery or hover glow
- Unsaved-work warnings for New Pose and Reset Canvas
- Responsive desktop behavior at 1920 × 1080 and 3440 × 1440

