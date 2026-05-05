const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  log: (msg) => ipcRenderer.invoke('log', msg),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  launchProject: (path) => ipcRenderer.invoke('launch-project', path),
  showBallMenu: () => ipcRenderer.invoke('show-ball-menu'),
  hideMenu: () => ipcRenderer.invoke('hide-menu'),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
  saveBallPosition: (x, y) => ipcRenderer.invoke('save-ball-position', x, y),
  moveBall: (dx, dy) => ipcRenderer.invoke('move-ball', dx, dy),
  getAppearance: () => ipcRenderer.invoke('get-appearance'),
  pickIcon: () => ipcRenderer.invoke('pick-icon'),
  saveAppearance: (appearance) => ipcRenderer.invoke('save-appearance', appearance),
  addProject: () => ipcRenderer.invoke('add-project'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  resizeMenu: (height) => ipcRenderer.invoke('resize-menu', height),
  onMenuShow: (callback) => ipcRenderer.on('menu-show', () => callback()),
  onMenuCloseRequest: (callback) => ipcRenderer.on('menu-close-request', () => callback()),
  notifyMenuAnimationDone: () => ipcRenderer.send('menu-animation-done'),
  onAppearanceChanged: (callback) => ipcRenderer.on('appearance-changed', (event, data) => callback(data))
});
