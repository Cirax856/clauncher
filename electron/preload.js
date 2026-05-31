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
  getStorageInfo: (opts) => ipcRenderer.invoke('games:getStorageInfo', opts),
  resetCompatData: (opts) => ipcRenderer.invoke('games:resetCompatData', opts),
  openFolder: (path) => ipcRenderer.invoke('games:openFolder', path),
  getLogs: (gameKey) => ipcRenderer.invoke('games:getLogs', gameKey),
  clearLogs: (gameKey) => ipcRenderer.invoke('games:clearLogs', gameKey),
  getProtonLog: (opts) => ipcRenderer.invoke('games:getProtonLog', opts),
  onGameLog: (gameKey, cb) => {
    const channel = `game:log:${gameKey}`
    const handler = (_, data) => cb(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
  onGameExit: (cb) => ipcRenderer.on('game:exit', (_, data) => cb(data)),
  onGamePlaytime: (cb) => ipcRenderer.on('game:playtime', (_, data) => cb(data)),
  killGame: (gameKey) => ipcRenderer.invoke('games:kill', gameKey),
  isGameRunning: (gameKey) => ipcRenderer.invoke('games:isRunning', gameKey),

  // Proton
  listProton: () => ipcRenderer.invoke('proton:list'),
  openProtonFolder: () => ipcRenderer.invoke('proton:openFolder'),
  platform: process.platform,
  getProtonVersionInfo: (protonPath) => ipcRenderer.invoke('proton:getVersionInfo', protonPath),
  getSteamRuntimeInfo: () => ipcRenderer.invoke('proton:getSteamRuntimeInfo'),
  checkGameNeedsRuntime: (opts) => ipcRenderer.invoke('proton:checkGameNeedsRuntime', opts),

  // Shell
  openExternal: (url) => ipcRenderer.send('shell:openExternal', url),

  onUpdaterStatus: (cb) => ipcRenderer.on('updater:status', (_, data) => cb(data)),
  installUpdate: () => ipcRenderer.send('updater:install'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  platform: process.platform,
})
