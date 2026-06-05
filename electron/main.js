const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { spawn, execSync } = require('child_process')
const Store = require('electron-store')
const axios = require('axios')
const { autoUpdater } = require('electron-updater')

autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://cdn.cirax.dev/clauncher/',
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
    if (process.platform === 'darwin') {
      win.webContents.send('updater:status', { state: 'manual', message: err.message })
      return
    }
    win.webContents.send('updater:status', { state: 'error', message: err.message })
  })

  ipcMain.on('updater:install', () => {
    autoUpdater.quitAndInstall()
  })
}

const store = new Store({
  defaults: { games: [], categories: [] },
})

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const isMac = process.platform === 'darwin'
  const isLinux = process.platform === 'linux'
  const isWindows = process.platform === 'win32'

  const win = new BrowserWindow({
    width: 1000,
    height: 680,
    minWidth: 800,
    minHeight: 560,
    frame: isLinux,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    backgroundColor: '#0f0f11',
    icon: path.join(__dirname, isWindows ? '../public/icon.ico' : '../public/icon.png'),
    title: `CLauncher v${app.getVersion()}`,
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

function getSystemInfo() {
  const info = []
  try {
    if (process.platform === 'linux') {
      info.push(`os: ${execSync('uname -sr').toString().trim()}`)
      try { info.push(`gpu: ${execSync("lspci | grep -i 'vga\\|3d\\|display' | head -1").toString().trim()}`) } catch {}
      try { info.push(`mesa: ${execSync('glxinfo 2>/dev/null | grep "OpenGL version"').toString().trim()}`) } catch {}
    } else if (process.platform === 'win32') {
      try { info.push(`os: ${execSync('ver').toString().trim()}`) } catch {}
    }
    info.push(`arch: ${process.arch}`)
    info.push(`electron: ${process.versions.electron}`)
    info.push(`node: ${process.versions.node}`)
  } catch {}
  return info
}

function getFolderSize(dirPath) {
  let total = 0
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        total += getFolderSize(full)
      } else {
        try { total += fs.statSync(full).size } catch {}
      }
    }
  } catch {}
  return total
}

function findProtonInstalls() {
  const home = os.homedir()
  const searchPaths = [
    path.join(home, '.steam/steam/steamapps/common'),
    path.join(home, '.local/share/Steam/steamapps/common'),
  ]
  const customPaths = [
    path.join(home, '.steam/root/compatibilitytools.d'),
    path.join(home, '.local/share/Steam/compatibilitytools.d'),
  ]

  const installs = []
  const seenPaths = new Set()

  function realPath(p) {
    try { return fs.realpathSync(p) } catch { return p }
  }

  for (const base of searchPaths) {
    const real = realPath(base)
    if (seenPaths.has(real)) continue
    seenPaths.add(real)
    try {
      const dirs = fs.readdirSync(base)
      for (const dir of dirs) {
        if (!dir.startsWith('Proton')) continue
        const protonBin = path.join(base, dir, 'proton')
        if (fs.existsSync(protonBin)) {
          const realBin = realPath(protonBin)
          if (seenPaths.has(realBin)) continue
          seenPaths.add(realBin)
          installs.push({ name: dir, path: protonBin, type: 'official' })
        }
      }
    } catch {}
  }

  for (const base of customPaths) {
    const real = realPath(base)
    if (seenPaths.has(real)) continue
    seenPaths.add(real)
    try {
      const dirs = fs.readdirSync(base)
      for (const dir of dirs) {
        const protonBin = path.join(base, dir, 'proton')
        if (fs.existsSync(protonBin)) {
          const realBin = realPath(protonBin)
          if (seenPaths.has(realBin)) continue
          seenPaths.add(realBin)
          installs.push({ name: dir, path: protonBin, type: 'custom' })
        }
      }
    } catch {}
  }

  return installs
}

app.whenReady().then(() => {
  const win = createWindow()
  setupUpdater(win)

  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.on('window:minimize', () => win.minimize())
  ipcMain.on('window:maximize', () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('window:close', () => win.close())

  ipcMain.handle('games:load', () => store.get('games'))
  ipcMain.handle('games:save', (_, games) => { store.set('games', games); return true })
  ipcMain.handle('categories:load', () => store.get('categories'))
  ipcMain.handle('categories:save', (_, categories) => { store.set('categories', categories); return true })

  // ── Startup ──────────────────────────────────────────
  ipcMain.handle('settings:getStartup', () => {
    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.handle('settings:setStartup', (_, enable) => {
    if (process.platform === 'linux') {
      const home = os.homedir()
      const autostartDir = path.join(home, '.config/autostart')
      const desktopFile = path.join(autostartDir, 'clauncher.desktop')
      if (enable) {
        fs.mkdirSync(autostartDir, { recursive: true })
        const execPath = app.getPath('exe')
        fs.writeFileSync(desktopFile, `[Desktop Entry]
  Type=Application
  Name=CLauncher
  Exec=${execPath}
  Hidden=false
  NoDisplay=false
  X-GNOME-Autostart-enabled=true
  `)
      } else {
        try { fs.unlinkSync(desktopFile) } catch {}
      }
      return
    }
    app.setLoginItemSettings({ openAtLogin: enable })
  })

  // ── Theme store ───────────────────────────────────────
  ipcMain.handle('settings:getTheme', () => store.get('theme', {}))
  ipcMain.handle('settings:setTheme', (_, theme) => {
    store.set('theme', theme)
  })

  // ── Launch game ──────────────────────────────────────
  const runningLogs = new Map()
  const runningProcs = new Map() // gameKey -> proc

  ipcMain.handle('games:launch', (_, { exec, params, name, appId, launchViaSteam, protonPath, env, elevated }) => {
    const gameKey = appId || name
    runningLogs.set(gameKey, { lines: [], exitCode: null, crashed: false, startTime: Date.now() })

    function pushLog(line, type = 'out') {
      const entry = runningLogs.get(gameKey)
      if (!entry) return
      entry.lines.push({ time: Date.now(), line, type })
      if (entry.lines.length > 2000) entry.lines.shift()
      if (!win.isDestroyed()) {
        win.webContents.send(`game:log:${gameKey}`, { line, type, time: Date.now() })
      }
    }

    // Steam launch — log but can't track process
    if (launchViaSteam) {
      if (!appId) return { ok: false, error: 'No Steam App ID set.' }
      pushLog(`[CLauncher] ═══════════════════════════════`, 'info')
      pushLog(`[CLauncher] game:     ${name}`, 'info')
      pushLog(`[CLauncher] appid:    ${appId}`, 'info')
      pushLog(`[CLauncher] method:   steam://rungameid/${appId}`, 'info')
      pushLog(`[CLauncher] started:  ${new Date().toISOString()}`, 'info')
      pushLog(`[CLauncher] ═══════════════════════════════`, 'info')
      pushLog(`[CLauncher] note: process tracking unavailable for Steam launches`, 'info')
      shell.openExternal(`steam://rungameid/${appId}`)
      if (!win.isDestroyed()) {
        win.webContents.send('game:playtime', { gameKey, playtimeMs: 0, lastPlayed: Date.now(), steam: true })
      }
      return { ok: true, gameKey }
    }

    if (!exec) return { ok: false, error: 'No executable path set.' }

    try {
      const args = params ? params.trim().split(/\s+/).filter(Boolean) : []
      const gameStartTime = Date.now()

      let proc
      let protonLogWatcher = null
      let protonLogPos = 0
      let compatData = null

      if (protonPath && process.platform === 'linux') {
        const home = os.homedir()
        const compatId = appId || name.replace(/\s+/g, '_')
        compatData = path.join(home, '.clauncher', 'compatdata', String(compatId))
        fs.mkdirSync(compatData, { recursive: true })

        const steamPath = [
          path.join(home, '.steam/steam'),
          path.join(home, '.local/share/Steam'),
        ].find(p => fs.existsSync(p)) || path.join(home, '.steam/steam')

        proc = spawn(protonPath, ['run', exec, ...args], {
          detached: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd: path.dirname(exec),
          env: {
            ...process.env,
            ...(env || {}),
            STEAM_COMPAT_DATA_PATH: compatData,
            STEAM_COMPAT_CLIENT_INSTALL_PATH: steamPath,
            SDL_VIDEODRIVER: 'x11',
            DISPLAY: process.env.DISPLAY || ':0',
            PROTON_LOG: '1',
            PROTON_LOG_DIR: compatData,
          },
        })

        // tail proton log — only available when compatData is defined
        function tailProtonLog(logPath) {
          if (!fs.existsSync(logPath)) {
            setTimeout(() => tailProtonLog(logPath), 1000)
            return
          }
          protonLogPos = fs.statSync(logPath).size
          protonLogWatcher = fs.watch(logPath, () => {
            try {
              const stat = fs.statSync(logPath)
              if (stat.size <= protonLogPos) return
              const fd = fs.openSync(logPath, 'r')
              const buf = Buffer.alloc(stat.size - protonLogPos)
              fs.readSync(fd, buf, 0, buf.length, protonLogPos)
              fs.closeSync(fd)
              protonLogPos = stat.size
              buf.toString('utf8').split('\n').filter(Boolean).forEach(l => {
                pushLog(l, 'proton')
              })
            } catch {}
          })
        }

        tailProtonLog(path.join(compatData, 'proton.log'))
      } else {
        if (elevated && process.platform === 'win32') {
          let command = `Start-Process -FilePath '${exec.replace(/'/g, "''")}' ` +
                        `-WorkingDirectory '${path.dirname(exec).replace(/'/g, "''")}' ` +
                        `-Verb RunAs`;
        
          if (args.length > 0) {
            const argString = args.map(arg => 
              arg.includes(' ') ? `"${arg.replace(/"/g, '""')}"` : arg
            ).join(' ');
            
            command += ` -ArgumentList '${argString.replace(/'/g, "''")}'`;
          }
        
          const psArgs = [
            '-NoProfile',
            '-WindowStyle', 'Hidden',
            '-Command',
            command
          ];
        
          proc = spawn('powershell.exe', psArgs, {
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe'],
          });
        } else if (elevated && process.platform === 'linux') {
          // use pkexec or sudo based on what's available
          const elevator = fs.existsSync('/usr/bin/pkexec') ? 'pkexec' : 'sudo'
          proc = spawn(elevator, [exec, ...args], {
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: path.dirname(exec),
            env: { ...process.env, ...(env || {}) },
          })
        } else {
          proc = spawn(exec, args, {
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: path.dirname(exec),
            env: { ...process.env, ...(env || {}) },
          })
        }
      }

      runningProcs.set(gameKey, proc)

      // game info header
      pushLog(`[CLauncher] ═══════════════════════════════`, 'info')
      pushLog(`[CLauncher] game:     ${name}`, 'info')
      pushLog(`[CLauncher] exec:     ${exec}`, 'info')
      pushLog(`[CLauncher] params:   ${params || 'none'}`, 'info')
      pushLog(`[CLauncher] appid:    ${appId || 'none'}`, 'info')
      pushLog(`[CLauncher] proton:   ${protonPath || 'native'}`, 'info')
      pushLog(`[CLauncher] pid:      ${proc.pid}`, 'info')
      pushLog(`[CLauncher] cwd:      ${path.dirname(exec)}`, 'info')
      pushLog(`[CLauncher] started:  ${new Date().toISOString()}`, 'info')
      pushLog(`[CLauncher] elevated: ${elevated ? 'yes' : 'no'}`, 'info')
      if (env && Object.keys(env).length > 0) {
        pushLog(`[CLauncher] env:      ${Object.entries(env).map(([k, v]) => `${k}=${v}`).join(' ')}`, 'info')
      }
      pushLog(`[CLauncher] ═══════════════════════════════`, 'info')

      // system info
      getSystemInfo().forEach(line => pushLog(`[CLauncher] ${line}`, 'info'))

      proc.stdout?.on('data', data => {
        data.toString().split('\n').filter(Boolean).forEach(l => pushLog(l, 'out'))
      })

      proc.stderr?.on('data', data => {
        data.toString().split('\n').filter(Boolean).forEach(l => pushLog(l, 'err'))
      })

      proc.on('exit', (code, signal) => {
        runningProcs.delete(gameKey)
        protonLogWatcher?.close()

        const entry = runningLogs.get(gameKey)
        if (entry) {
          entry.exitCode = code
          entry.crashed = code !== 0 && code !== null
          entry.endTime = Date.now()
        }

        const playtimeMs = Date.now() - gameStartTime
        const playtimeMins = Math.round(playtimeMs / 1000 / 60)

        pushLog(`[CLauncher] ═══════════════════════════════`, 'info')
        pushLog(`[CLauncher] exited with code ${code ?? signal}`, code === 0 ? 'info' : 'err')
        pushLog(`[CLauncher] session playtime: ${playtimeMins}m`, 'info')
        pushLog(`[CLauncher] ═══════════════════════════════`, 'info')

        if (!win.isDestroyed()) {
          win.webContents.send('game:exit', { gameKey, code, crashed: code !== 0 && code !== null })
          win.webContents.send('game:playtime', { gameKey, playtimeMs, lastPlayed: Date.now() })
        }
      })

      proc.on('error', err => {
        pushLog(`[CLauncher] spawn error: ${err.message}`, 'err')
        if (err.code === 'EACCES' || err.code === 'EPERM') {
          pushLog(`[CLauncher] hint: permission denied — try launching as administrator`, 'err')
        }
        if (!win.isDestroyed()) {
          win.webContents.send('game:exit', {
            gameKey,
            code: -1,
            crashed: true,
            error: err.message,
            needsElevation: err.code === 'EACCES' || err.code === 'EPERM',
          })
        }
      })

      return { ok: true, gameKey }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('games:kill', (_, gameKey) => {
    const proc = runningProcs.get(gameKey)
    if (!proc) return { ok: false, error: 'No running process found' }
    try {
      proc.kill('SIGTERM')
      setTimeout(() => {
        if (runningProcs.has(gameKey)) proc.kill('SIGKILL')
      }, 3000)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })
  
  ipcMain.handle('games:isRunning', (_, gameKey) => {
    return runningProcs.has(gameKey)
  })

  ipcMain.handle('games:getLogs', (_, gameKey) => runningLogs.get(gameKey) || null)
  ipcMain.handle('games:clearLogs', (_, gameKey) => { runningLogs.delete(gameKey) })

  ipcMain.handle('games:getProtonLog', (_, { appId, name }) => {
    if (process.platform !== 'linux') return null
    const home = os.homedir()
    const compatId = appId || name.replace(/\s+/g, '_')
    const compatData = path.join(home, '.clauncher', 'compatdata', String(compatId))

    const logPaths = [
      path.join(compatData, 'proton.log'),
      path.join(compatData, 'steam.log'),
      path.join(home, 'proton.log'),
    ]

    for (const logPath of logPaths) {
      try {
        if (fs.existsSync(logPath)) {
          const stat = fs.statSync(logPath)
          const size = stat.size
          const fd = fs.openSync(logPath, 'r')
          const readSize = Math.min(size, 100 * 1024)
          const buf = Buffer.alloc(readSize)
          fs.readSync(fd, buf, 0, readSize, size - readSize)
          fs.closeSync(fd)
          return { path: logPath, content: buf.toString('utf8') }
        }
      } catch {}
    }
    return null
  })

  // ── File picker ──────────────────────────────────────
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

  // ── Version check ────────────────────────────────────
  ipcMain.handle('games:checkVersion', async (_, { appId }) => {
    try {
      const infoUrl = `https://api.steamcmd.net/v1/info/${appId}`
      const { data: infoData } = await axios.get(infoUrl, { timeout: 8000 })
      const depots = infoData?.data?.[appId]?.depots?.branches?.public
      const latestBuild = depots?.buildid ?? null
      return { ok: true, latestBuild: latestBuild ? String(latestBuild) : null }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // ── Storage ──────────────────────────────────────────
  ipcMain.handle('games:getStorageInfo', (_, { appId, name, exec }) => {
    if (process.platform !== 'linux') return null
    const home = os.homedir()
    const compatId = appId || name.replace(/\s+/g, '_')
    const compatPath = path.join(home, '.clauncher', 'compatdata', String(compatId))
    const compatExists = fs.existsSync(compatPath)
    const compatSize = compatExists ? getFolderSize(compatPath) : 0
    let gameSize = 0
    let gamePath = null
    if (exec) {
      gamePath = path.dirname(exec)
      if (fs.existsSync(gamePath)) gameSize = getFolderSize(gamePath)
    }
    return { compatPath, compatExists, compatSize, gamePath, gameSize }
  })

  ipcMain.handle('games:resetCompatData', (_, { appId, name }) => {
    if (process.platform !== 'linux') return { ok: false }
    const home = os.homedir()
    const compatId = appId || name.replace(/\s+/g, '_')
    const compatPath = path.join(home, '.clauncher', 'compatdata', String(compatId))
    try {
      fs.rmSync(compatPath, { recursive: true, force: true })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('games:openFolder', (_, folderPath) => shell.openPath(folderPath))

  // ── Proton ───────────────────────────────────────────
  ipcMain.handle('proton:list', () => {
    if (process.platform !== 'linux') return []
    return findProtonInstalls()
  })

  ipcMain.handle('proton:openFolder', async () => {
    const home = os.homedir()
    const customPath = path.join(home, '.local/share/Steam/compatibilitytools.d')
    try { fs.mkdirSync(customPath, { recursive: true }) } catch {}
    shell.openPath(customPath)
  })

  ipcMain.handle('proton:getVersionInfo', (_, protonPath) => {
    if (process.platform !== 'linux') return null
    const protonDir = path.dirname(protonPath)
    const result = { dxvk: null, vkd3d: null, wine: null }

    const dxvkPaths = [
      path.join(protonDir, 'files/lib64/wine/dxvk/version'),
      path.join(protonDir, 'dist/lib64/wine/dxvk/version'),
      path.join(protonDir, 'files/lib/wine/dxvk/version'),
    ]
    for (const p of dxvkPaths) {
      try { result.dxvk = fs.readFileSync(p, 'utf8').trim(); break } catch {}
    }

    const vkd3dPaths = [
      path.join(protonDir, 'files/lib64/wine/vkd3d-proton/version'),
      path.join(protonDir, 'dist/lib64/wine/vkd3d-proton/version'),
    ]
    for (const p of vkd3dPaths) {
      try { result.vkd3d = fs.readFileSync(p, 'utf8').trim(); break } catch {}
    }

    const winePaths = [
      path.join(protonDir, 'files/bin/wine'),
      path.join(protonDir, 'dist/bin/wine'),
    ]
    for (const p of winePaths) {
      if (fs.existsSync(p)) {
        try {
          const out = require('child_process').execSync(`"${p}" --version 2>/dev/null`, { timeout: 3000 }).toString().trim()
          result.wine = out.replace('wine-', '').split(' ')[0]
          break
        } catch {}
      }
    }
    return result
  })

  ipcMain.handle('proton:getSteamRuntimeInfo', () => {
    if (process.platform !== 'linux') return null
    const home = os.homedir()
    const steamPaths = [
      path.join(home, '.steam/steam'),
      path.join(home, '.local/share/Steam'),
      path.join(home, '.steam/root'),
    ]
    const result = { steamPath: null, runtimes: [], pressureVesselAvailable: false }
    const runtimeAppIds = {
      '1070560': 'Steam Linux Runtime (Scout)',
      '1391110': 'Steam Linux Runtime - Soldier',
      '1628350': 'Steam Linux Runtime - Sniper',
      '1493710': 'Steam Linux Runtime - Heavy',
    }
    const seenSteamPaths = new Set()

    for (const steamPath of steamPaths) {
      if (!fs.existsSync(steamPath)) continue
      let realSteamPath
      try { realSteamPath = fs.realpathSync(steamPath) } catch { realSteamPath = steamPath }
      if (seenSteamPaths.has(realSteamPath)) continue
      seenSteamPaths.add(realSteamPath)
      result.steamPath = steamPath

      const steamappsPath = path.join(steamPath, 'steamapps')

      for (const [appId, name] of Object.entries(runtimeAppIds)) {
        const manifestPath = path.join(steamappsPath, `appmanifest_${appId}.acf`)
        if (!fs.existsSync(manifestPath)) continue
        let installDir = null
        try {
          const content = fs.readFileSync(manifestPath, 'utf8')
          const match = content.match(/"installdir"\s+"([^"]+)"/)
          if (match) installDir = match[1]
        } catch {}
        const runtimePath = installDir
          ? path.join(steamappsPath, 'common', installDir)
          : path.join(steamappsPath, 'common', name)
        const pvPaths = [
          path.join(runtimePath, 'run'),
          path.join(runtimePath, 'pressure-vessel', 'bin', 'steam-runtime-launcher-interface-0'),
          path.join(runtimePath, '_v2-entry-point'),
        ]
        const hasPressureVessel = pvPaths.some(p => fs.existsSync(p))
        let version = null
        const versionPaths = [
          path.join(runtimePath, 'VERSIONS.txt'),
          path.join(runtimePath, 'version.txt'),
        ]
        for (const vp of versionPaths) {
          try {
            const content = fs.readFileSync(vp, 'utf8')
            const match = content.match(/VERSION[=:]\s*"?([^\s"]+)"?/)
            if (match) { version = match[1]; break }
          } catch {}
        }
        result.runtimes.push({ name, path: runtimePath, hasPressureVessel, version, appId })
        if (hasPressureVessel) result.pressureVesselAvailable = true
      }

      const commonPath = path.join(steamappsPath, 'common')
      try {
        const dirs = fs.readdirSync(commonPath)
        for (const dir of dirs) {
          if (!dir.toLowerCase().includes('steam linux runtime')) continue
          if (result.runtimes.find(r => r.path.includes(dir))) continue
          const runtimePath = path.join(commonPath, dir)
          const pvPaths = [
            path.join(runtimePath, 'run'),
            path.join(runtimePath, '_v2-entry-point'),
          ]
          const hasPressureVessel = pvPaths.some(p => fs.existsSync(p))
          result.runtimes.push({ name: dir, path: runtimePath, hasPressureVessel, version: null, appId: null })
          if (hasPressureVessel) result.pressureVesselAvailable = true
        }
      } catch {}

      if (result.runtimes.length > 0) break
    }
    return result
  })

  ipcMain.handle('proton:checkGameNeedsRuntime', (_, { appId }) => {
    if (process.platform !== 'linux') return null
    const home = os.homedir()
    const steamPaths = [
      path.join(home, '.steam/steam'),
      path.join(home, '.local/share/Steam'),
    ]
    for (const steamPath of steamPaths) {
      if (!appId) continue
      const manifestPath = path.join(steamPath, 'steamapps', `appmanifest_${appId}.acf`)
      try {
        if (fs.existsSync(manifestPath)) {
          const content = fs.readFileSync(manifestPath, 'utf8')
          const needsRuntime = content.includes('steam_linux_runtime') ||
            content.includes('pressure-vessel') ||
            content.includes('SteamLinuxRuntime')
          return { needsRuntime, manifestFound: true }
        }
      } catch {}
    }
    return { needsRuntime: false, manifestFound: false }
  })

  ipcMain.handle('proton:getLatestGE', async () => {
    return new Promise((resolve, reject) => {
      const https = require('https')
      const options = {
        hostname: 'api.github.com',
        path: '/repos/GloriousEggroll/proton-ge-custom/releases/latest',
        headers: { 'User-Agent': 'CLauncher' }
      }
      https.get(options, res => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            const asset = json.assets?.find(a => a.name.endsWith('.tar.gz'))
            resolve({ version: json.tag_name, url: asset?.browser_download_url, name: asset?.name, size: asset?.size })
          } catch { reject(new Error('Failed to parse release')) }
        })
      }).on('error', reject)
    })
  })

  ipcMain.handle('proton:installGE', async (_, { url, name }) => {
    const home = os.homedir()
    const installDir = path.join(home, '.local/share/Steam/compatibilitytools.d')
    const tmpFile = path.join(os.tmpdir(), name)
    fs.mkdirSync(installDir, { recursive: true })
    const https = require('https')
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tmpFile)
      https.get(url, res => {
        const total = parseInt(res.headers['content-length'] || '0')
        let downloaded = 0
        res.on('data', chunk => {
          downloaded += chunk.length
          if (total) {
            const percent = Math.round((downloaded / total) * 100)
            win.webContents.send('proton:installProgress', { percent })
          }
        })
        res.pipe(file)
        file.on('finish', () => { file.close(); resolve() })
      }).on('error', reject)
    })
    await new Promise((resolve, reject) => {
      const proc = spawn('tar', ['-xzf', tmpFile, '-C', installDir], { stdio: 'ignore' })
      proc.on('exit', code => code === 0 ? resolve() : reject(new Error('Extraction failed')))
      proc.on('error', reject)
    })
    fs.unlinkSync(tmpFile)
    return { ok: true }
  })

  ipcMain.on('shell:openExternal', (_, url) => shell.openExternal(url))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})