# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Development mode — spawns Electron via dev.js
npm run build    # Production build (electron-builder)
```

No test suite is configured.

## Architecture

Electron desktop app: a drag gable floating ball (64x64 purple circle) that provides quick project switching for Claude Code sessions. Always-on-top, frameless, transparent window pinned above all workspaces.

### Process model

**Main process** (`main.js`) — owns all windows and system tray. Handles IPC, config persistence, auto-start registry, and logging.

**Preload** (`preload.js`) — bridges IPC to renderers via `contextBridge.exposeInMainWorld('electronAPI', {...})`. All renderer communication goes through typed `ipcRenderer.invoke` calls.

**Renderers** — three standalone HTML pages, each loaded into its own `BrowserWindow`:

| File | Window | Purpose |
|------|--------|---------|
| `src/ball.html` | 64×64 transparent | Draggable UI; click opens menu, mousedown+mousemove drags the window |
| `src/menu.html` | 220×200 popup | Lists projects from config; click launches `claude` in that project dir |
| `src/settings.html` | 600×600 resizable | Auto-start toggle + ball appearance customization (icon, colors, size, shape) |

### Data flow

1. **Project launch**: menu click → `ipcRenderer.invoke('launch-project', path)` → main process spawns `start cmd /K "cd /d "<path>" && claude"`
2. **Ball drag**: renderer tracks mouse delta → `moveBall(dx, dy)` IPC → main moves the `BrowserWindow` via `setPosition`
3. **Config persist**: ball position saved on drag-end and app-quit to `%APPDATA%\com.ai-floating-launcher.app\config.json`
4. **Project list**: read from `projects.json` in the same config directory (manually edited by user)

### Config & state

- `%APPDATA%\com.ai-floating-launcher.app\config.json` — `{ ball_x, ball_y, auto_start }` (auto-managed)
- `%APPDATA%\com.ai-floating-launcher.app\projects.json` — `{ "projects": ["path\\to\\project", ...] }` (manual edit)
- Debug logs written to timestamped `debug_*.log` files in the same config dir, plus stderr

### Logging

Custom timestamped logger in main.js — `writeLog(level, msg)` writes to both stderr and a dated log file. Renderers can log via `ipcRenderer.invoke('log', msg)`.

### Key details

- `dev.js` unsets `ELECTRON_RUN_AS_NODE` before spawning Electron — required because Electron checks this env var at startup
- The tray icon is programmatically generated at runtime (16x16 RGBA buffer, purple circle) — no icon files needed
- `window-all-closed` is intentionally a no-op: the app stays alive in the system tray
- Menu window auto-closes on blur; clicking a project or settings closes the menu before performing the action
## UI Design

All new windows and UI should follow these conventions (established with settings.html):

**Window chrome:**
- `frame: false, transparent: true, hasShadow: true` — frameless with rounded corners
- Resizable with sensible `minWidth`/`minHeight`
- Custom titlebar with `-webkit-app-region: drag`, title text, and close button (`&times;`)

**Color palette:**
- Window background: `#1e1e1e`
- Section/card backgrounds: `#2d2d2d`
- Borders/dividers: `#333`, `#3a3a3a`, `#444`
- Text primary: `#fff`, secondary: `#ccc`, muted: `#aaa` / `#888` / `#666`
- Accent: `#667eea` (purple-blue), hover: `#5a6fd6`
- Danger (close button hover): `#e81123`

**Typography:**
- Font: `'Segoe UI', sans-serif`
- Section labels: `13px`, `#aaa`, uppercase, `letter-spacing: 0.5px`
- Title: `16px`, weight 600
- Body: `14px`

**Spacing & shape:**
- Window border-radius: `10px`
- Window border: `1px solid #3a3a3a`
- Button border-radius: `6px`
- Content padding: `16px 24px 20px`

**Scrollbar:**
```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #777; }
```

### Key details

- `dev.js` unsets `ELECTRON_RUN_AS_NODE` before spawning Electron — required because Electron checks this env var at startup
- The tray icon is programmatically generated at runtime (16x16 RGBA buffer, purple circle) — no icon files needed
- `window-all-closed` is intentionally a no-op: the app stays alive in the system tray
- Menu window auto-closes on blur; clicking a project or settings closes the menu before performing the action
