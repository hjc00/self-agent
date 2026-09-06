const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// ---- Lazy paths (set after app is ready) ----
let configDir, configPath, projectsPath;

// ---- Windows ----
let ballWindow = null;
let menuWindow = null;
let settingsWindow = null;
let tray = null;
let menuClosedAt = 0;
let menuCloseTimeout = null;

// ---- Config ----
let config = { ball_x: 100, ball_y: 100, auto_start: false };

// ---- Logging ----
let _logPath = null;

function timestamp() {
  const d = new Date();
  return [
    d.getHours().toString().padStart(2, '0'),
    d.getMinutes().toString().padStart(2, '0'),
    d.getSeconds().toString().padStart(2, '0'),
    '.',
    d.getMilliseconds().toString().padStart(3, '0')
  ].join('');
}

function initLog() {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  const d = new Date();
  const pad = (n, len) => String(n).padStart(len, '0');
  const name = `debug_${d.getFullYear()}${pad(d.getMonth()+1,2)}${pad(d.getDate(),2)}_${pad(d.getHours(),2)}${pad(d.getMinutes(),2)}${pad(d.getSeconds(),2)}.log`;
  _logPath = path.join(configDir, name);
  writeLog('INIT', '========== SESSION START ==========');
  writeLog('INIT', 'log file: ' + _logPath);
}

function writeLog(level, msg) {
  const line = `${timestamp()} [${level}] ${msg}\n`;
  process.stderr.write(line);
  if (_logPath) {
    try { fs.appendFileSync(_logPath, line); } catch (e) {}
  }
}

// ---- Config helpers ----
function loadConfig() {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(raw);
  } catch (e) {
    config = { ball_x: 100, ball_y: 100, auto_start: false };
  }
  if (!config.appearance) {
    config.appearance = {
      icon_data: '',
      color1: '#667eea',
      color2: '#764ba2',
      size: 64,
      shape: 'circle'
    };
  }
  writeLog('MAIN', `config loaded: x=${config.ball_x} y=${config.ball_y}`);
}

function saveConfig() {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  writeLog('MAIN', `config saved: x=${config.ball_x} y=${config.ball_y}`);
}

function normalizeProject(entry) {
  if (typeof entry === 'string') {
    return { path: entry, disableHooks: false };
  }
  if (entry && typeof entry === 'object') {
    return { path: entry.path || '', disableHooks: !!entry.disableHooks };
  }
  return { path: '', disableHooks: false };
}

function loadProjects() {
  try {
    const raw = fs.readFileSync(projectsPath, 'utf-8');
    const data = JSON.parse(raw);
    const rawList = data.projects || [];
    return rawList.map(normalizeProject).filter(p => p.path);
  } catch (e) {
    return [];
  }
}

function saveProjects(projects) {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(projectsPath, JSON.stringify({ projects }, null, 2));
}

function isAutostartEnabled() {
  // Check Windows Registry Run key
  return new Promise((resolve) => {
    exec('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "AI-Floating-Launcher"', (err, stdout) => {
      resolve(!err && stdout.includes('AI-Floating-Launcher'));
    });
  });
}

function setAutostartRegistry(enabled) {
  const exePath = process.execPath;
  if (enabled) {
    exec(`reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "AI-Floating-Launcher" /t REG_SZ /d "${exePath}" /f`);
  } else {
    exec(`reg delete "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "AI-Floating-Launcher" /f`);
  }
}

// ---- Tray icon ----
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 102, g: 126, b: 234 };
}

function buildTrayImage(appearance) {
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - 1;
  const color = hexToRgb(appearance.color1);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;
      if (dist <= r) {
        buf[idx] = color.r;
        buf[idx + 1] = color.g;
        buf[idx + 2] = color.b;
        buf[idx + 3] = 255;
      } else {
        buf[idx + 3] = 0;
      }
    }
  }

  var trayImg = nativeImage.createFromBuffer(buf, { width: size, height: size });

  if (appearance.icon_data) {
    try {
      var iconImg = nativeImage.createFromDataURL(appearance.icon_data);
      if (!iconImg.isEmpty()) {
        var overlay = iconImg.resize({ width: 10, height: 10 });
        var canvas = nativeImage.createFromBuffer(buf, { width: size, height: size });
        // Composite overlay at center
        var overlayBuf = overlay.toBitmap();
        var canvasBuf = canvas.toBitmap();
        var ox = 3, oy = 3;
        for (var iy = 0; iy < 10; iy++) {
          for (var ix = 0; ix < 10; ix++) {
            var srcIdx = (iy * 10 + ix) * 4;
            var dstIdx = ((oy + iy) * size + (ox + ix)) * 4;
            var sa = overlayBuf[srcIdx + 3];
            if (sa > 0) {
              canvasBuf[dstIdx] = overlayBuf[srcIdx];
              canvasBuf[dstIdx + 1] = overlayBuf[srcIdx + 1];
              canvasBuf[dstIdx + 2] = overlayBuf[srcIdx + 2];
              canvasBuf[dstIdx + 3] = sa;
            }
          }
        }
        trayImg = nativeImage.createFromBuffer(canvasBuf, { width: size, height: size });
      }
    } catch (e) {
      writeLog('MAIN', 'tray icon overlay failed: ' + e.message);
    }
  }

  return trayImg;
}

function rebuildTrayIcon() {
  if (tray && !tray.isDestroyed()) {
    tray.setImage(buildTrayImage(config.appearance));
    writeLog('MAIN', 'tray icon rebuilt');
  }
}

function applyAppearanceToBall() {
  if (ballWindow && !ballWindow.isDestroyed()) {
    ballWindow.webContents.send('appearance-changed', config.appearance);
    writeLog('MAIN', 'appearance pushed to ball');
  }
}

// ---- Windows ----
function createBallWindow() {
  var appSize = (config.appearance && config.appearance.size) || 64;
  ballWindow = new BrowserWindow({
    width: appSize,
    height: appSize,
    x: config.ball_x,
    y: config.ball_y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  ballWindow.loadFile('src/ball.html');
  ballWindow.setAlwaysOnTop(true, 'screen-saver');
  ballWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  ballWindow.on('moved', () => {
    const [x, y] = ballWindow.getPosition();
    config.ball_x = x;
    config.ball_y = y;
  });

  writeLog('MAIN', 'ball window created');
}

function closeMenuWithAnimation() {
  if (!menuWindow || menuWindow.isDestroyed()) return;
  if (menuWindow._closing) return;
  menuWindow._closing = true;
  menuWindow.webContents.send('menu-close-request');
  menuCloseTimeout = setTimeout(() => {
    if (menuWindow && !menuWindow.isDestroyed()) {
      menuWindow.close();
    }
  }, 400);
}

function createMenuWindow() {
  if (menuWindow && !menuWindow.isDestroyed()) {
    if (!menuWindow._closing) {
      closeMenuWithAnimation();
    }
    return;
  }

  const screen = require('electron').screen;
  const ballBounds = ballWindow.getBounds();
  const workArea = screen.getDisplayMatching(ballBounds).workArea;

  const MENU_WIDTH = 220;
  const MENU_INITIAL_HEIGHT = 600;
  const GAP = 6;

  // Horizontal: prefer right of ball; flip to left if it would overflow
  let menuX = ballBounds.x + ballBounds.width + GAP;
  if (menuX + MENU_WIDTH > workArea.x + workArea.width) {
    menuX = ballBounds.x - GAP - MENU_WIDTH;
  }
  if (menuX < workArea.x) menuX = workArea.x;
  if (menuX + MENU_WIDTH > workArea.x + workArea.width) {
    menuX = workArea.x + workArea.width - MENU_WIDTH;
  }

  // Vertical: align top with ball; actual height adjustment happens in resize-menu
  let menuY = ballBounds.y;

  menuWindow = new BrowserWindow({
    width: MENU_WIDTH,
    height: MENU_INITIAL_HEIGHT,
    x: menuX,
    y: menuY,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  menuWindow.loadFile('src/menu.html');
  menuWindow.setAlwaysOnTop(true, 'screen-saver');
  menuWindow.once('ready-to-show', () => {
    menuWindow.show();
    menuWindow.webContents.send('menu-show');
  });
  menuWindow.on('blur', () => {
    closeMenuWithAnimation();
  });
  menuWindow.on('closed', () => {
    menuClosedAt = Date.now();
    menuWindow = null;
  });

  writeLog('MAIN', 'menu window created at ' + menuX + ',' + menuY);
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 600,
    minWidth: 400,
    minHeight: 380,
    frame: false,
    transparent: true,
    resizable: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadFile('src/settings.html');
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

// ---- IPC Handlers ----
ipcMain.handle('log', (event, message) => {
  writeLog('JS', message);
});

ipcMain.handle('get-projects', () => {
  const projects = loadProjects();
  writeLog('MAIN', 'get-projects: ' + projects.length + ' items');
  return projects;
});

function findGitBash() {
  if (process.env.CLAUDE_CODE_GIT_BASH_PATH) return process.env.CLAUDE_CODE_GIT_BASH_PATH;
  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    path.join(app.getPath('home'), 'AppData', 'Local', 'Programs', 'Git', 'bin', 'bash.exe')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return '';
}

ipcMain.handle('launch-project', (event, projectPath, mode) => {
  writeLog('MAIN', 'launch-project: ' + projectPath + ' mode=' + (mode || 'default'));
  const bashPath = findGitBash();
  const escapedPath = projectPath.replace(/'/g, "''");
  const claudeCmd = path.join(process.env.APPDATA || '', 'npm', 'claude.cmd').replace(/'/g, "''");
  const extraArgs = mode === 'bypassPermission' ? ' --dangerously-skip-permissions' : '';
  let psCmd;
  if (bashPath) {
    const bashEscaped = bashPath.replace(/'/g, "''");
    psCmd = `$env:CLAUDE_CODE_GIT_BASH_PATH='${bashEscaped}'; Set-Location -LiteralPath '${escapedPath}'; & '${claudeCmd}'${extraArgs}`;
  } else {
    psCmd = `Set-Location -LiteralPath '${escapedPath}'; & '${claudeCmd}'${extraArgs}`;
  }
  exec(`start "Claude" powershell -NoExit -Command "${psCmd}"`);
});

ipcMain.handle('show-ball-menu', () => {
  if (menuWindow && !menuWindow.isDestroyed()) {
    writeLog('MAIN', 'toggle: hide menu');
    closeMenuWithAnimation();
    return;
  }
  // If menu was just closed by blur (user clicked the ball), don't reopen immediately
  if (Date.now() - menuClosedAt < 200) {
    writeLog('MAIN', 'show-ball-menu: ignored (recently closed)');
    return;
  }
  writeLog('MAIN', 'show-ball-menu');
  createMenuWindow();
});

ipcMain.handle('hide-menu', () => {
  writeLog('MAIN', 'hide-menu');
  closeMenuWithAnimation();
});

ipcMain.handle('open-settings', () => {
  writeLog('MAIN', 'open-settings');
  createSettingsWindow();
});

ipcMain.handle('get-config', () => {
  return config;
});

ipcMain.handle('get-auto-start', async () => {
  return await isAutostartEnabled();
});

ipcMain.handle('set-auto-start', (event, enabled) => {
  config.auto_start = enabled;
  setAutostartRegistry(enabled);
  saveConfig();
});

ipcMain.handle('save-ball-position', (event, x, y) => {
  config.ball_x = x;
  config.ball_y = y;
});

ipcMain.handle('move-ball', (event, dx, dy) => {
  if (ballWindow && !ballWindow.isDestroyed()) {
    const [x, y] = ballWindow.getPosition();
    ballWindow.setPosition(x + dx, y + dy);
  }
});

ipcMain.handle('get-appearance', () => {
  return config.appearance;
});

ipcMain.handle('pick-icon', async () => {
  var result = await dialog.showOpenDialog(settingsWindow || ballWindow, {
    title: '选择前景图标',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  try {
    var img = nativeImage.createFromPath(result.filePaths[0]);
    if (img.isEmpty()) {
      writeLog('MAIN', 'pick-icon: failed to load image');
      return null;
    }
    var size = img.getSize();
    var maxDim = Math.max(size.width, size.height);
    if (maxDim > 256) {
      var scale = 256 / maxDim;
      img = img.resize({ width: Math.round(size.width * scale), height: Math.round(size.height * scale) });
    }
    var pngBuf = img.toPNG();
    var b64 = pngBuf.toString('base64');
    var dataUri = 'data:image/png;base64,' + b64;
    writeLog('MAIN', 'pick-icon: got image ' + img.getSize().width + 'x' + img.getSize().height);
    return dataUri;
  } catch (e) {
    writeLog('MAIN', 'pick-icon error: ' + e.message);
    return null;
  }
});

ipcMain.handle('add-project', async () => {
  const result = await dialog.showOpenDialog(ballWindow || menuWindow, {
    title: '选择项目目录',
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, reason: 'cancelled' };
  }

  const newPath = result.filePaths[0];
  const projects = loadProjects();

  if (projects.some(p => p.path === newPath)) {
    return { success: false, reason: 'duplicate', path: newPath };
  }

  projects.push({ path: newPath, disableHooks: false });
  saveProjects(projects);
  writeLog('MAIN', 'add-project: added ' + newPath);
  return { success: true, path: newPath };
});

ipcMain.handle('toggle-git-hooks', async (event, projectPath) => {
  const projects = loadProjects();
  const project = projects.find(p => p.path === projectPath);
  if (!project) {
    return { success: false, error: 'Project not found' };
  }

  const newState = !project.disableHooks;
  const gitCmd = newState
    ? `git -C "${projectPath}" config --local core.hooksPath /dev/null`
    : `git -C "${projectPath}" config --local --unset core.hooksPath`;

  return new Promise((resolve) => {
    exec(gitCmd, (err, stdout, stderr) => {
      if (err) {
        const isUnsetNotFound = !newState && (err.code === 5 || stderr.includes('exit code 5') || stderr.includes('section or key is invalid'));
        if (!isUnsetNotFound) {
          writeLog('MAIN', 'toggle-git-hooks error: ' + (stderr || err.message));
          resolve({ success: false, error: stderr || err.message });
          return;
        }
      }
      project.disableHooks = newState;
      saveProjects(projects);
      writeLog('MAIN', `toggle-git-hooks: ${projectPath} disableHooks=${newState}`);
      resolve({ success: true, disableHooks: newState });
    });
  });
});

ipcMain.handle('remove-project', (event, projectPath) => {
  const projects = loadProjects().filter(p => p.path !== projectPath);
  saveProjects(projects);
  writeLog('MAIN', 'remove-project: removed ' + projectPath);
  return { success: true, projects };
});

ipcMain.handle('open-in-explorer', (event, projectPath) => {
  shell.openPath(projectPath);
  writeLog('MAIN', 'open-in-explorer: ' + projectPath);
});

ipcMain.handle('quit-app', () => {
  writeLog('MAIN', 'quit-app from menu');
  if (ballWindow && !ballWindow.isDestroyed()) {
    const [x, y] = ballWindow.getPosition();
    config.ball_x = x;
    config.ball_y = y;
    saveConfig();
  }
  app.exit(0);
});

ipcMain.handle('resize-menu', (event, height) => {
  if (menuWindow && !menuWindow.isDestroyed()) {
    const screen = require('electron').screen;
    let newHeight = Math.round(height);
    if (newHeight < 100) newHeight = 100;

    const [x, y] = menuWindow.getPosition();
    const workArea = screen.getDisplayNearestPoint({ x: x, y: y }).workArea;
    const ballBounds = ballWindow && !ballWindow.isDestroyed() ? ballWindow.getBounds() : null;

    let newY = y;

    // If opening downward would overflow bottom, open upward (align menu bottom with ball top)
    if (ballBounds && newY + newHeight > workArea.y + workArea.height) {
      newY = ballBounds.y - newHeight;
    }

    // Clamp to work area (handles both top and bottom edges)
    if (newY < workArea.y) newY = workArea.y;
    if (newY + newHeight > workArea.y + workArea.height) {
      newY = workArea.y + workArea.height - newHeight;
    }

    menuWindow.setBounds({ x: x, y: newY, width: 220, height: newHeight });
    writeLog('MAIN', 'resize-menu: h=' + newHeight + ' y=' + newY);
  }
});

ipcMain.on('menu-animation-done', () => {
  if (menuCloseTimeout) {
    clearTimeout(menuCloseTimeout);
    menuCloseTimeout = null;
  }
  if (menuWindow && !menuWindow.isDestroyed()) {
    menuWindow.close();
  }
});

ipcMain.handle('save-appearance', (event, appearance) => {
  if (typeof appearance.size !== 'number' || appearance.size < 48 || appearance.size > 128) {
    writeLog('MAIN', 'save-appearance: invalid size ' + appearance.size);
    return { success: false, error: '大小必须在 48-128 之间' };
  }
  var validShapes = ['circle', 'rounded-square', 'square'];
  if (!validShapes.includes(appearance.shape)) {
    writeLog('MAIN', 'save-appearance: invalid shape ' + appearance.shape);
    return { success: false, error: '无效的形状值' };
  }

  config.appearance = {
    icon_data: appearance.icon_data || '',
    color1: appearance.color1 || '#667eea',
    color2: appearance.color2 || '#764ba2',
    size: appearance.size,
    shape: appearance.shape
  };

  saveConfig();

  if (ballWindow && !ballWindow.isDestroyed()) {
    ballWindow.setSize(appearance.size, appearance.size);
  }
  applyAppearanceToBall();
  rebuildTrayIcon();

  writeLog('MAIN', 'save-appearance: saved size=' + appearance.size + ' shape=' + appearance.shape);
  return { success: true };
});

// ---- App lifecycle ----
function initPaths() {
  configDir = path.join(app.getPath('appData'), 'com.self-agent.app');
  configPath = path.join(configDir, 'config.json');
  projectsPath = path.join(configDir, 'projects.json');
}

app.whenReady().then(() => {
  initPaths();
  initLog();
  loadConfig();

  createBallWindow();

  // System tray
  tray = new Tray(buildTrayImage(config.appearance));
  tray.setToolTip('AI Floating Launcher');
  const trayMenu = Menu.buildFromTemplate([
    { label: '重置位置', click: () => {
      if (ballWindow && !ballWindow.isDestroyed()) {
        ballWindow.setPosition(100, 100);
        config.ball_x = 100;
        config.ball_y = 100;
        saveConfig();
      }
    }},
    { label: '设置', click: () => createSettingsWindow() },
    { type: 'separator' },
    { label: '退出', click: () => {
      if (ballWindow && !ballWindow.isDestroyed()) {
        const [x, y] = ballWindow.getPosition();
        config.ball_x = x;
        config.ball_y = y;
        saveConfig();
      }
      app.exit(0);
    }}
  ]);
  tray.setContextMenu(trayMenu);
  tray.on('double-click', () => createSettingsWindow());

  writeLog('MAIN', 'app ready');
});

app.on('window-all-closed', () => {
  // Don't quit - app runs in tray
});

app.on('before-quit', () => {
  saveConfig();
  writeLog('MAIN', 'app quit');
});
