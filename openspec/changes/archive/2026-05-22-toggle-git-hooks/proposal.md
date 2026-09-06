## Why

Users often encounter Git hooks (e.g., pre-commit linting via Husky) that slow down or block workflows when using Claude Code. Currently, disabling hooks requires manual terminal commands per project. A one-click toggle from the floating launcher menu would streamline this common workflow.

## What Changes

- Add a **"More" (⋮) button** to each project row in the menu window, visible on hover
- Clicking ⋮ opens a **floating dropdown** with project-level actions:
  - **Toggle Git Hooks**: Disable or re-enable Git hooks for the project
  - **Open in File Explorer**: Open the project directory in the system file explorer
  - **Remove from List**: Remove the project from the launcher without deleting files
- **Hook state is persisted** per project in `projects.json` alongside the project path
- The menu window's existing launch buttons (▶ / ⚡) remain unchanged
- Data migration: existing `projects.json` string array is normalized to object format on read; writes always use the new object format

## Capabilities

### New Capabilities
- `git-hook-toggle`: Quick disable/enable of Git hooks for individual projects via a floating dropdown menu, with state persistence

### Modified Capabilities
- *(none)*

## Impact

- `src/menu.html` — new ⋮ button, dropdown menu UI, positioning logic
- `src/preload.js` — new IPC channels: `toggle-git-hooks`, `remove-project`, `open-in-explorer`
- `main.js` — new IPC handlers for toggle/remove/explore; `loadProjects()` migration; `saveProjects()` unified format
- `projects.json` schema change from `string[]` to `{ path: string, disableHooks?: boolean }[]`
