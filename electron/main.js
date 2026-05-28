const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const Store = require('electron-store')
const axios = require('axios')
const { autoUpdater } = require('electron-updater')

// configure feed URL — points to your server
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://cdn.cirax.dev/releases',
})

autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

function setupUpdater(win) {
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-available', (info) => {
    win.webContents.send('updater:status', { state: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    win.webContents.send('updater:status', { state: 'latest' })
  })

  autoUpdater.on('download-progress', (progress) => {
    win.webContents.send('updater:status', { state: 'downloading', percent: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('updater:status', { state: 'ready' })
  })

  autoUpdater.on('error', (err) => {
    win.webContents.send('updater:status', { state: 'error', message: err.message })
  })

  ipcMain.on('updater:install', () => {
    autoUpdater.quitAndInstall()
  })
}

const store = new Store({
  defaults: {
    games: [],
    categories: [],
  },
})

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 680,
    minWidth: 800,
    minHeight: 560,
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    backgroundColor: '#0f0f11',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  const win = createWindow()
  setupUpdater(win)

  // Window controls
  ipcMain.on('window:minimize', () => win.minimize())
  ipcMain.on('window:maximize', () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('window:close', () => win.close())

  // Game store
  ipcMain.handle('games:load', () => store.get('games'))
  ipcMain.handle('games:save', (_, games) => {
    store.set('games', games)
    return true
  })

  ipcMain.handle('categories:load', () => store.get('categories'))
  ipcMain.handle('categories:save', (_, categories) => {
    store.set('categories', categories)
    return true
  })

  // Launch game
  ipcMain.handle('games:launch', (_, { exec, params, name, appId, launchViaSteam }) => {
    if (launchViaSteam) {
      if (!appId) return { ok: false, error: 'No Steam App ID set — required for Steam launch.' }
      shell.openExternal(`steam://rungameid/${appId}`)
      return { ok: true }
    }

    if (!exec) return { ok: false, error: 'No executable path set.' }

    try {
      const args = params
        ? params.trim().split(/\s+/).filter(Boolean)
        : []
      const path = require('path')
      const proc = spawn(exec, args, {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(exec),
      })
      proc.unref()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Pick executable via dialog
  ipcMain.handle('games:pickExec', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Select game executable',
      filters: [
        { name: 'Executables', extensions: ['exe', 'sh', 'app', 'bat'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths.length) return null
    return result.filePaths[0]
  })

  // Version check via SteamCMD public API
  ipcMain.handle('games:checkVersion', async (_, { appId, installedVersion }) => {
    try {
      const infoUrl = `https://api.steamcmd.net/v1/info/${appId}`
      console.log('[checkVersion] fetching:', infoUrl)

      const { data: infoData } = await axios.get(infoUrl, { timeout: 8000 })
      const depots = infoData?.data?.[appId]?.depots?.branches?.public

      console.log('[checkVersion] depots:', JSON.stringify(depots))

      const latestBuild = depots?.buildid ?? null

      console.log('[checkVersion] latestBuild:', latestBuild, '| installedVersion:', installedVersion)

      return {
        ok: true,
        latestBuild: latestBuild ? String(latestBuild) : null,
      }
    } catch (err) {
      console.error('[checkVersion] error:', err.message)
      return { ok: false, error: err.message }
    }
  })

  // Open external URL
  ipcMain.on('shell:openExternal', (_, url) => {
    shell.openExternal(url)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})