import { useState, useEffect, useCallback, useRef } from 'react'

const COLORS = [
  { accent: '#2563eb', bg: '#03060f', border: '#1e3a8a' },
  { accent: '#10b981', bg: '#021007', border: '#065f46' },
  { accent: '#f59e0b', bg: '#0f0800', border: '#78350f' },
  { accent: '#8b5cf6', bg: '#08040f', border: '#4c1d95' },
  { accent: '#ec4899', bg: '#0f0208', border: '#831843' },
  { accent: '#ef4444', bg: '#0f0202', border: '#7f1d1d' },
  { accent: '#06b6d4', bg: '#020a0f', border: '#155e75' },
]

let _nextId = 100
let _nextCatId = 200
let _nextLaunchId = 300
let _nextNoteId = 400

function nextLaunchId() { return _nextLaunchId++ }
function nextNoteId() { return _nextNoteId++ }
function nextId() { return _nextId++ }
function nextCatId() { return _nextCatId++ }

export function useGames() {
  const [games, setGames] = useState([])
  const [categories, setCategories] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [statuses, setStatuses] = useState({})
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const [protonInstalls, setProtonInstalls] = useState([])
  const [runningGames, setRunningGames] = useState(new Set())

  // Load from electron-store on mount
  useEffect(() => {
    async function load() {
      if (window.electronAPI) {
        const savedGames = await window.electronAPI.loadGames()
        const savedCats = await window.electronAPI.loadCategories()

        setGames(savedGames || [])
        setCategories(savedCats || [])

        if (savedGames?.length) {
          _nextId = Math.max(...savedGames.map(g => g.id)) + 1
        }
        if (savedCats?.length) {
          _nextCatId = Math.max(...savedCats.map(c => c.id)) + 1
        }

        if (window.electronAPI?.platform === 'linux') {
          const installs = await window.electronAPI.listProton()
          setProtonInstalls(installs)
        }
      }
      setLoaded(true)
    }
    load()
  }, [])

  // Persist games on change
  useEffect(() => {
    if (!loaded) return
    if (window.electronAPI) {
      window.electronAPI.saveGames(games)
    }
  }, [games, loaded])

  // Persist categories on change
  useEffect(() => {
    if (!loaded) return
    if (window.electronAPI) {
      window.electronAPI.saveCategories(categories)
    }
  }, [categories, loaded])

  // Check all versions once after load
  useEffect(() => {
    if (!loaded || !games.length) return
    checkAllVersions()
  }, [loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!window.electronAPI?.onGamePlaytime) return
    window.electronAPI.onGamePlaytime(({ gameKey, playtimeMs, lastPlayed, steam }) => {
      setGames(prev => prev.map(g => {
        if ((g.appId || g.name) !== gameKey) return g
        const prevTotal = g.totalPlaytime || 0
        return {
          ...g,
          lastPlayed,
          totalPlaytime: steam ? prevTotal : prevTotal + playtimeMs,
          lastSessionPlaytime: steam ? null : playtimeMs,
        }
      }))
    })
  }, [loaded])

  useEffect(() => {
    if (!window.electronAPI?.onGameExit) return
    window.electronAPI.onGameExit(({ gameKey }) => {
      setRunningGames(prev => { const s = new Set(prev); s.delete(gameKey); return s })
    })
  }, [loaded])

  const showToast = useCallback((msg, type = 'info') => {
    clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  // ── Games ──────────────────────────────────────────────

  const addGame = useCallback((data) => {
    const id = nextId()
    const colorIndex = games.length % COLORS.length
    setGames(prev => [...prev, { ...data, id, colorIndex }])
    showToast(`${data.name} added`)
    return id
  }, [games.length, showToast])

  const updateGame = useCallback((id, data) => {
    setGames(prev => prev.map(g => g.id === id ? { ...g, ...data } : g))
    if (data.version !== undefined || data.appId !== undefined) {
      setStatuses(prev => ({ ...prev, [id]: undefined }))
    }
    showToast('Changes saved')
  }, [showToast])

  const removeGame = useCallback((id) => {
    setGames(prev => prev.filter(g => g.id !== id))
    setStatuses(prev => { const s = { ...prev }; delete s[id]; return s })
  }, [])

  const launchGame = useCallback(async (game, elevated = false) => {
    const result = await window.electronAPI.launchGame({
      exec: game.exec,
      params: game.params,
      name: game.name,
      appId: game.appId,
      launchViaSteam: game.launchViaSteam || false,
      protonPath: game.protonPath || null,
      env: game.env || {},
      elevated,
    })
    if (result.ok) {
      const gameKey = game.appId || game.name
      if (!game.launchViaSteam) {
        setRunningGames(prev => new Set([...prev, gameKey]))
      }
      showToast(`Launched ${game.name}${elevated ? ' (admin)' : ''}`, 'success')
    } else {
      showToast(result.error || 'Launch failed', 'error')
    }
  }, [showToast])
  
  const killGame = useCallback(async (game) => {
    if (!window.electronAPI) return
    const gameKey = game.appId || game.name
    const result = await window.electronAPI.killGame(gameKey)
    if (!result.ok) showToast(result.error || 'Could not kill game', 'error')
  }, [showToast])

  const pickExec = useCallback(async () => {
    if (!window.electronAPI) return null
    return window.electronAPI.pickExec()
  }, [])

  const setGamesOrder = useCallback((ordered) => {
    setGames(ordered)
  }, [])

  // ── Version checking ───────────────────────────────────

  const checkVersion = useCallback(async (game) => {
    if (!game.appId) return
    setStatuses(prev => ({ ...prev, [game.id]: { state: 'checking' } }))

    if (!window.electronAPI) {
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))
      setStatuses(prev => ({
        ...prev,
        [game.id]: { state: Math.random() > 0.4 ? 'up-to-date' : 'outdated', latestBuild: '15234567' }
      }))
      return
    }

    const result = await window.electronAPI.checkVersion({
      appId: game.appId,
      installedVersion: game.version,
    })

    if (!result.ok) {
      setStatuses(prev => ({ ...prev, [game.id]: { state: 'error', error: result.error } }))
      showToast(`Check failed: ${result.error}`, 'error')
      return
    }

    setStatuses(prev => ({
      ...prev,
      [game.id]: {
        state: result.latestBuild && game.version
          ? (game.version.trim() === result.latestBuild.trim() ? 'up-to-date' : 'outdated')
          : 'done',
        latestBuild: result.latestBuild,
      }
    }))
  }, [showToast])

  const checkAllVersions = useCallback(() => {
    games.filter(g => g.appId).forEach(g => checkVersion(g))
  }, [games, checkVersion])

  const openSteamDB = useCallback((appId) => {
    const url = `https://www.steamdb.info/app/${appId}/`
    if (window.electronAPI) window.electronAPI.openExternal(url)
    else window.open(url, '_blank')
  }, [])

  const openProtonDB = useCallback((appId) => {
    const url = `https://www.protondb.com/app/${appId}`
    if (window.electronAPI) window.electronAPI.openExternal(url)
    else window.open(url, '_blank')
  }, [])

  // ── Categories ─────────────────────────────────────────

  const addCategory = useCallback((name) => {
    const id = nextCatId()
    setCategories(prev => [...prev, { id, name }])
    return id
  }, [])

  const updateCategory = useCallback((id, name) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c))
  }, [])

  const removeCategory = useCallback((id) => {
    setCategories(prev => prev.filter(c => c.id !== id))
    setGames(prev => prev.map(g => g.categoryId === id ? { ...g, categoryId: null } : g))
  }, [])

  const addLaunch = useCallback((gameId, data) => {
    const id = nextLaunchId()
    setGames(prev => prev.map(g => g.id === gameId
      ? { ...g, launches: [...(g.launches || []), { ...data, id }] }
      : g
    ))
    return id
  }, [])
  
  const updateLaunch = useCallback((gameId, launchId, data) => {
    setGames(prev => prev.map(g => g.id === gameId
      ? { ...g, launches: (g.launches || []).map(l => l.id === launchId ? { ...l, ...data } : l) }
      : g
    ))
  }, [])
  
  const removeLaunch = useCallback((gameId, launchId) => {
    setGames(prev => prev.map(g => g.id === gameId
      ? { ...g, launches: (g.launches || []).filter(l => l.id !== launchId) }
      : g
    ))
  }, [])

  const addNote = useCallback((gameId, data) => {
    const id = nextNoteId()
    setGames(prev => prev.map(g => g.id === gameId
      ? { ...g, notes: [...(g.notes || []), { ...data, id }] }
      : g
    ))
    return id
  }, [])
  
  const updateNote = useCallback((gameId, noteId, data) => {
    setGames(prev => prev.map(g => g.id === gameId
      ? { ...g, notes: (g.notes || []).map(l => l.id === noteId ? { ...l, ...data } : l) }
      : g
    ))
  }, [])
  
  const removeNote = useCallback((gameId, noteId) => {
    setGames(prev => prev.map(g => g.id === gameId
      ? { ...g, notes: (g.notes || []).filter(l => l.id !== noteId) }
      : g
    ))
  }, [])

  return {
    games,
    categories,
    loaded,
    statuses,
    toast,
    colors: COLORS,
    addGame,
    updateGame,
    removeGame,
    launchGame,
    pickExec,
    runningGames,
    killGame,
    setGamesOrder,
    checkVersion,
    checkAllVersions,
    openSteamDB, openProtonDB,
    showToast,
    addCategory,
    updateCategory,
    removeCategory,
    addLaunch,
    updateLaunch,
    removeLaunch,
    addNote,
    updateNote,
    removeNote,
    protonInstalls,
    refreshProton: async () => {
      if (window.electronAPI?.platform === 'linux') {
        const installs = await window.electronAPI.listProton()
        setProtonInstalls(installs)
      }
    },
  }
}