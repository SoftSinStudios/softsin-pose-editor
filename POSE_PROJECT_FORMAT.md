# SoftSin Pose Project Format

Format name: SoftSin Pose Project  
File extension: `.softpose`  
Current version: `1.0.0`  
MIME type: `application/vnd.softsin.pose-project`

## Purpose

A `.softpose` file is the complete, reopenable Pose Editor workspace. Unlike a pose JSON or control PNG, it can preserve the original reference image alongside the editable pose.

Projects are saved to the user's device. The Pose Editor does not upload the project or its reference image to a SoftSin server.

## Container

The format is a standard ZIP container using stored entries. A version 1 project contains:

| Entry | Required | Description |
| --- | --- | --- |
| `manifest.json` | Yes | Format identity, version, timestamps, and reference metadata |
| `pose.json` | Yes | Editable pose state and export settings |
| Reference image | No | Original image bytes under the filename recorded in the manifest |

Consumers must use the manifest rather than assuming a fixed reference-image filename or image type.

## Format responsibilities

- `.softpose` is the authoritative format for continuing an editing session with its reference image.
- JSON is the lightweight interchange format for editable pose data.
- PNG is the clean BODY_25-compatible control image. SoftSin pose metadata may be embedded for re-import, but the reference image is intentionally excluded.

## Compatibility rules

- Readers should reject unsupported major versions with a clear error rather than partially loading unknown data.
- New optional manifest fields may be added in compatible minor revisions.
- Missing optional reference data must not prevent the pose itself from loading.
- Exported PNGs must never include editor-only overlays such as selection, hover, control handles, or the source reference image.

