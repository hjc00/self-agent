const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog } = require('electron');
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

function loadProjects() {
  try {
    const raw = fs.readFileSync(projectsPath, 'utf-8');
    const data = JSON.parse(raw);
    return data.projects || [];
  } catch (e) {
    return [];
  }
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

  const [bx, by] = ballWindow.getPosition();
  const menuX = bx + 64 + 6;
  const menuY = by;

  menuWindow = new BrowserWindow({
    width: 220,
    height: 600,
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

ipcMain.handle('launch-project', (event, projectPath) => {
  writeLog('MAIN', 'launch-project: ' + projectPath);
  const bashPath = findGitBash();
  const escapedPath = projectPath.replace(/'/g, "''");
  const claudeCmd = path.join(process.env.APPDATA || '', 'npm', 'claude.cmd').replace(/'/g, "''");
  let psCmd;
  if (bashPath) {
    const bashEscaped = bashPath.replace(/'/g, "''");
    psCmd = `$env:CLAUDE_CODE_GIT_BASH_PATH='${bashEscaped}'; Set-Location -LiteralPath '${escapedPath}'; & '${claudeCmd}'`;
  } else {
    psCmd = `Set-Location -LiteralPath '${escapedPath}'; & '${claudeCmd}'`;
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

  if (projects.includes(newPath)) {
    return { success: false, reason: 'duplicate', path: newPath };
  }

  projects.push(newPath);
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(projectsPath, JSON.stringify({ projects }, null, 2));
  writeLog('MAIN', 'add-project: added ' + newPath);
  return { success: true, path: newPath };
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
    const workArea = require('electron').screen.getPrimaryDisplay().workArea;
    const [x, y] = menuWindow.getPosition();
    let newHeight = Math.round(height);
    // Ensure minimum height
    if (newHeight < 100) newHeight = 100;
    // Push up if would go off bottom of screen
    let newY = y;
    if (newY + newHeight > workArea.y + workArea.height) {
      newY = workArea.y + workArea.height - newHeight;
      if (newY < workArea.y) newY = workArea.y;
    }
    menuWindow.setBounds({ x: x, y: newY, width: 220, height: newHeight });
    writeLog('MAIN', 'resize-menu: ' + newHeight + ' y=' + newY);
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
