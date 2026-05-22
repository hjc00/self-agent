## 1. Main Process — Data & IPC Handlers

- [x] 1.1 Update `loadProjects()` to normalize legacy `string[]` entries to `{ path, disableHooks: false }` objects
- [x] 1.2 Update `saveProjects()` to always write unified object format `{ path, disableHooks }`
- [x] 1.3 Add `toggle-git-hooks` IPC handler: run `git config --local core.hooksPath /dev/null` or unset, update state, return result
- [x] 1.4 Add `remove-project` IPC handler: remove project from array, save, return updated list
- [x] 1.5 Add `open-in-explorer` IPC handler: open project path with `shell.openPath`

## 2. Preload Bridge

- [x] 2.1 Expose `toggleGitHooks(path)` → `ipcRenderer.invoke('toggle-git-hooks', path)`
- [x] 2.2 Expose `removeProject(path)` → `ipcRenderer.invoke('remove-project', path)`
- [x] 2.3 Expose `openInExplorer(path)` → `ipcRenderer.invoke('open-in-explorer', path)`

## 3. Menu UI — Dropdown & Interactions

- [x] 3.1 Add ⋮ button to each project row, visible on hover alongside ▶ / ⚡
- [x] 3.2 Build floating dropdown component with actions: Toggle Git Hooks, Open in File Explorer, Remove from List
- [x] 3.3 Implement dropdown open/close logic: only one open at a time, close on outside click
- [x] 3.4 Implement drop-up positioning when row is near bottom of menu
- [x] 3.5 Wire "Toggle Git Hooks" action to `toggleGitHooks()` IPC and update label based on state
- [x] 3.6 Wire "Open in File Explorer" action to `openInExplorer()` IPC
- [x] 3.7 Wire "Remove from List" action to `removeProject()` IPC and re-render list
- [x] 3.8 Style dropdown to match app dark theme (background, border, hover states, scrollbar)

## 4. Integration & Validation

- [x] 4.1 Run `npm run dev` and verify menu renders correctly with legacy `projects.json`
- [x] 4.2 Verify toggling hooks modifies `.git/config` correctly
- [x] 4.3 Verify remove action updates file and UI
- [x] 4.4 Verify dropdown positioning at top, middle, and bottom rows
