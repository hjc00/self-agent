## Context

The floating launcher menu (`src/menu.html`) currently lists projects as simple rows with hover-revealed launch buttons (▶ / ⚡). There is no UI for project-level actions such as removing a project from the list, opening its directory, or managing Git hooks. Project data is stored in `projects.json` as a flat string array of paths.

## Goals / Non-Goals

**Goals:**
- Add a hover-visible ⋮ button to each project row that opens a floating dropdown menu
- Provide one-click disable/enable of Git hooks per project using `git config --local core.hooksPath`
- Persist hook state per project in `projects.json`
- Remain backward-compatible with existing `string[]` `projects.json`
- Support "Open in File Explorer" and "Remove from List" actions in the same dropdown

**Non-Goals:**
- Changing existing ▶ / ⚡ launch button behavior
- Managing global Git config or hooks outside the project
- Handling projects that already have a custom `core.hooksPath` set (assumed rare; if needed, a future iteration can save/restore the original value)
- In-place editing of project paths or reordering

## Decisions

### 1. Floating dropdown instead of inline accordion
**Rationale:** A floating dropdown (absolute-positioned overlay) avoids changing the menu window height, eliminating the need for `resizeMenu()` on open/close and simplifying animation logic. It also visually separates the action list from the project list.

### 2. `core.hooksPath` for hook toggling
**Rationale:** Using `git config --local core.hooksPath /dev/null` is a clean, reversible way to disable all hooks for a project without touching hook files. Restoring is a single `git config --local --unset core.hooksPath`. Alternatives considered:
- `--no-verify` per command: requires passing flags to every Git invocation, which Claude Code abstracts away.
- Renaming `.git/hooks`: stateful and risks leaving the repo in an inconsistent state if the app crashes.

### 3. Unified object format on write
**Rationale:** Reading normalizes both old `string[]` and new object formats. Writing always emits `{ path, disableHooks }` objects for consistency and forward-compatibility. This means the first write after upgrade will rewrite the file, but data is preserved.

### 4. Only one dropdown open at a time
**Rationale:** Clicking a second ⋮ button closes the first dropdown. This prevents overlapping menus and keeps the UI predictable.

### 5. Dropdown positioning: drop-up when near bottom edge
**Rationale:** The menu window is small (220px). If a project row is near the bottom, the dropdown should open upward to avoid clipping. The renderer computes the row index and flips the direction class accordingly.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Custom `core.hooksPath` overwritten and lost | Assumed nonexistent for now. If discovered later, extend to read/store the original value before overwriting. |
| Old `projects.json` with string array fails to load | Normalize on read: every entry is coerced to `{ path, disableHooks: false }`. |
| Dropdown clips outside the 220px menu window | Compute row index; if in the bottom N rows, add a CSS class that flips the dropdown upward. |
| Git is not installed or not in PATH when toggling hooks | `toggle-git-hooks` handler returns `{ success, error }`. UI shows an inline error or logs it. |
