const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Games
  loadGames: () => ipcRenderer.invoke('games:load'),
  saveGames: (games) => ipcRenderer.invoke('games:save', games),
  loadCategories: () => ipcRenderer.invoke('categories:load'),
  saveCategories: (categories) => ipcRenderer.invoke('categories:save', categories),
  launchGame: (opts) => ipcRenderer.invoke('games:launch', opts),
  pickExec: () => ipcRenderer.invoke('games:pickExec'),
  checkVersion: (opts) => ipcRenderer.invoke('games:checkVersion', opts),

  // Shell
  openExternal: (url) => ipcRenderer.send('shell:openExternal', url),

  onUpdaterStatus: (cb) => ipcRenderer.on('updater:status', (_, data) => cb(data)),
  installUpdate: () => ipcRenderer.send('updater:install'),
})
