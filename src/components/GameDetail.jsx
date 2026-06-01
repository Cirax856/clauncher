import { useState, useRef, useEffect } from 'react'
import styles from './GameDetail.module.css'
import LogViewer from './LogViewer'

function CustomSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = options.find(o => o.value === value) || options[0]

  useEffect(() => {
    function handleClick(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className={styles.customSelect} ref={ref}>
      <button
        type="button"
        className={`${styles.selectTrigger} ${open ? styles.selectOpen : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>{selected?.label}</span>
        <i className={`ti ti-chevron-down ${styles.selectChevron} ${open ? styles.selectChevronOpen : ''}`} />
      </button>
      {open && (
        <div className={styles.selectDropdown}>
          {options.map(opt => (
            <button
              key={String(opt.value)}
              type="button"
              className={`${styles.selectOption} ${opt.value === value ? styles.selectOptionActive : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            >
              {opt.value === value && <i className="ti ti-check" style={{ fontSize: 11 }} />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase()
}

function VersionBadge({ status, game }) {
  if (!game.appId) return null
  if (!status || status.state === 'idle') {
    return <span className={`${styles.badge} ${styles.badgeMuted}`}>not checked</span>
  }
  if (status.state === 'checking') {
    return <span className={`${styles.badge} ${styles.badgeBlue}`}>checking…</span>
  }
  if (status.state === 'error') {
    return <span className={`${styles.badge} ${styles.badgeRed}`}>error</span>
  }
  if (status.state === 'up-to-date') {
    return <span className={`${styles.badge} ${styles.badgeGreen}`}><i className="ti ti-check" /> up to date</span>
  }
  if (status.state === 'outdated') {
    return <span className={`${styles.badge} ${styles.badgeAmber}`}><i className="ti ti-alert-triangle" /> update available</span>
  }
  if (status.state === 'done') {
    return <span className={`${styles.badge} ${styles.badgeBlue}`}>build {status.latestBuild || 'checked'}</span>
  }
  return null
}

function LaunchDropdown({ game, onLaunchConfig, onClose }) {
  return (
    <div className={styles.launchDropdown}>
      {(game.launches || []).map(l => (
        <button
          key={l.id}
          className={styles.launchDropdownItem}
          onClick={() => { onLaunchConfig(l); onClose() }}
        >
          <div className={styles.launchDropdownName}>{l.name}</div>
          <div className={styles.launchDropdownMeta}>
            {l.viaSteam
              ? <span className={styles.launchDropdownTag}>steam</span>
              : <span className={styles.launchDropdownParams}>{l.params || 'no params'}</span>
            }
          </div>
        </button>
      ))}
    </div>
  )
}

function LaunchForm({ launch, onSave, onClose }) {
  const [form, setForm] = useState(
    launch
      ? { name: launch.name, params: launch.params, viaSteam: launch.viaSteam }
      : { name: '', params: '', viaSteam: false }
  )

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function handleKey(e) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className={styles.launchFormOverlay} onClick={onClose} onKeyDown={handleKey}>
      <div className={styles.launchFormCard} onClick={e => e.stopPropagation()}>
        <div className={styles.launchFormHeader}>
          <span>{launch ? 'edit launch' : 'new launch'}</span>
          <button onClick={onClose} className={styles.launchFormClose}><i className="ti ti-x" /></button>
        </div>
        <div className={styles.launchFormFields}>
          <div className={styles.launchFormField}>
            <label>name</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Quick launch name"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && form.name.trim()) { onSave(form); onClose() } }}
            />
          </div>
          <div className={styles.launchFormField}>
            <label>parameters</label>
            <input
              value={form.params}
              onChange={e => set('params', e.target.value)}
              placeholder="-novid -high"
              className={styles.mono}
              disabled={form.viaSteam}
              style={{ opacity: form.viaSteam ? 0.4 : 1 }}
            />
          </div>
          <label className={`${styles.checkLabel} ${form.viaSteam ? styles.checkActive : ''}`}>
            <input
              type="checkbox"
              className={styles.checkInput}
              checked={form.viaSteam || false}
              onChange={e => set('viaSteam', e.target.checked)}
            />
            <span className={styles.checkBox}>
              {form.viaSteam && <i className="ti ti-check" />}
            </span>
            <span>Launch via Steam</span>
          </label>
        </div>
        <div className={styles.launchFormActions}>
          <button
            className={styles.launchFormSave}
            onClick={() => { if (form.name.trim()) { onSave(form); onClose() } }}
            disabled={!form.name.trim()}
          >
            save
          </button>
          <button className={styles.launchFormCancel} onClick={onClose}>cancel</button>
        </div>
      </div>
    </div>
  )
}

function NoteForm({ note, onSave, onClose }) {
  const [form, setForm] = useState(
    note
      ? { name: note.name, note: note.content }
      : { name: '', note: '' }
  )

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function handleKey(e) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className={styles.launchFormOverlay} onClick={onClose} onKeyDown={handleKey}>
      <div className={styles.launchFormCard} onClick={e => e.stopPropagation()}>
        <div className={styles.launchFormHeader}>
          <span>{note ? 'edit note' : 'new note'}</span>
          <button onClick={onClose} className={styles.launchFormClose}><i className="ti ti-x" /></button>
        </div>
        <div className={styles.launchFormFields}>
          <div className={styles.launchFormField}>
            <label>name</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Name note"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && form.name.trim()) { onSave(form); onClose() } }}
            />
          </div>
          <div className={styles.launchFormField}>
            <label>content</label>
            <textarea
              value={form.params}
              onChange={e => set('content', e.target.value)}
              placeholder="Note content"
              className={`${styles.mono} ${styles.textareaField}`}
              rows={1}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
            />
          </div>
        </div>
        <div className={styles.launchFormActions}>
          <button
            className={styles.launchFormSave}
            onClick={() => { if (form.name.trim()) { onSave(form); onClose() } }}
            disabled={!form.name.trim()}
          >
            save
          </button>
          <button className={styles.launchFormCancel} onClick={onClose}>cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function GameDetail({ game, status, color, onLaunch, onEdit, onCheckVersion, onOpenSteamDB, onOpenProtonDB, onUpdateGame, onAddLaunch, onUpdateLaunch, onRemoveLaunch, onLaunchConfig, onAddNote, onUpdateNote, onRemoveNote, protonInstalls, runningGames, onKillGame }) {
  const [editingParams, setEditingParams] = useState(false)
  const [paramsVal, setParamsVal] = useState(game.params || '')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [launchForm, setLaunchForm] = useState(null) // null | { launch: null|Launch }
  const [noteForm, setNoteForm] = useState(null) // null | { note: null|Note }
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmDeleteNote, setConfirmDeleteNote] = useState(null)
  const dropdownRef = useRef(null)
  const [protonRec, setProtonRec] = useState(null)
  const [protonRecLoading, setProtonRecLoading] = useState(false)
  const [newEnvKey, setNewEnvKey] = useState('')
  const [newEnvVal, setNewEnvVal] = useState('')
  const [envError, setEnvError] = useState(null)
  const [storageInfo, setStorageInfo] = useState(null)
  const [storageLoading, setStorageLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [crashInfo, setCrashInfo] = useState(null)
  const [runtimeWarning, setRuntimeWarning] = useState(null)
  const gameKey = game.appId || game.name
  const isRunning = runningGames?.has(gameKey)
  const [hoveringLaunch, setHoveringLaunch] = useState(false)
  const [elevated, setElevated] = useState(game.elevated || false)

  function formatPlaytime(ms) {
    if (!ms) return '—'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) {
      const secs = (ms / 1000).toFixed(1)
      return `${secs}s`
    }
    const totalMins = Math.floor(ms / 1000 / 60)
    if (totalMins < 60) return `${totalMins}m`
    const hours = Math.floor(totalMins / 60)
    const mins = totalMins % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  
  function formatLastPlayed(ts) {
    if (!ts) return '—'
    const now = Date.now()
    const diff = now - ts
    const mins = Math.floor(diff / 1000 / 60)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (mins < 2) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(ts).toLocaleDateString()
  }

  useEffect(() => {
    if (!window.electronAPI?.onGameExit) return
    window.electronAPI.onGameExit(({ gameKey, code, crashed, error, needsElevation }) => {
      const key = game.appId || game.name
      if (gameKey !== key) return
      if (crashed) {
        setCrashInfo({ code, error, needsElevation })
      }
    })
  }, [game.id])

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  function handleAddEnv() {
    const key = newEnvKey.trim()
    const val = newEnvVal.trim()
    if (!key) { setEnvError('key required'); return }
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) { setEnvError('invalid key — use letters, numbers, underscores'); return }
    const current = game.env || {}
    onUpdateGame({ env: { ...current, [key]: val } })
    setNewEnvKey('')
    setNewEnvVal('')
    setEnvError(null)
  }

  function handleRemoveEnv(key) {
    const current = { ...game.env }
    delete current[key]
    onUpdateGame({ env: current })
  }

  function handleEnvKeyDown(e) {
    if (e.key === 'Enter') handleAddEnv()
    if (e.key === 'Escape') { setNewEnvKey(''); setNewEnvVal(''); setEnvError(null) }
  }

  useEffect(() => {
    function handleClick(e) {
      if (!dropdownRef.current?.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!game.appId || !protonInstalls?.length) return
    if (window.electronAPI?.platform !== 'linux') return
    setProtonRec(null)
    setProtonRecLoading(true)
    fetch(`https://www.protondb.com/api/v1/reports/summaries/${game.appId}.json`)
      .then(r => r.json())
      .then(data => {
        const tier = data.tier || data.trendingTier
        let rec = null
        if (tier === 'platinum' || tier === 'gold') {
          rec = {
            tier,
            label: 'Works great',
            desc: 'Runs well on official Proton. Use the latest stable version.',
            protonType: 'stable',
            color: '#22c55e',
          }
        } else if (tier === 'silver') {
          rec = {
            tier,
            label: 'Try GE-Proton',
            desc: 'Some issues on official Proton. GE-Proton usually fixes them.',
            protonType: 'ge',
            color: '#f59e0b',
          }
        } else if (tier === 'bronze' || tier === 'borked') {
          rec = {
            tier,
            label: tier === 'borked' ? 'Likely broken' : 'Runs poorly',
            desc: 'Known issues on Linux. Try GE-Proton or Experimental — may not work at all.',
            protonType: 'experimental',
            color: '#ef4444',
          }
        } else if (tier === 'native') {
          rec = {
            tier,
            label: 'Native Linux build',
            desc: 'This game has a native Linux version. No Proton needed.',
            protonType: null,
            color: '#60a5fa',
          }
        }
        setProtonRec(rec)
      })
      .catch(() => {})
      .finally(() => setProtonRecLoading(false))
  }, [game.appId, game.id])

  useEffect(() => {
    if (window.electronAPI?.platform !== 'linux') return
    if (!window.electronAPI?.getStorageInfo) return
    setStorageInfo(null)
    setStorageLoading(true)
    window.electronAPI.getStorageInfo({
      appId: game.appId,
      name: game.name,
      exec: game.exec,
    }).then(info => {
      setStorageInfo(info)
    }).catch(() => {}).finally(() => setStorageLoading(false))
  }, [game.id, game.exec, game.appId])

  useEffect(() => {
    if (window.electronAPI?.platform !== 'linux') return
    if (!game.appId || !window.electronAPI?.checkGameNeedsRuntime) return
    window.electronAPI.checkGameNeedsRuntime({ appId: game.appId })
      .then(result => {
        if (result?.needsRuntime) setRuntimeWarning(result)
        else setRuntimeWarning(null)
      })
      .catch(() => {})
  }, [game.id, game.appId])

  useEffect(() => {
    setElevated(game.elevated || false)
  }, [game.id])

  async function handleResetCompat() {
    setResetting(true)
    await window.electronAPI.resetCompatData({ appId: game.appId, name: game.name })
    const info = await window.electronAPI.getStorageInfo({ appId: game.appId, name: game.name, exec: game.exec })
    setStorageInfo(info)
    setResetting(false)
    setConfirmReset(false)
  }

  function handleParamsSave() {
    onUpdateGame({ params: paramsVal })
    setEditingParams(false)
  }

  function handleParamsKey(e) {
    if (e.key === 'Enter') handleParamsSave()
    if (e.key === 'Escape') { setParamsVal(game.params || ''); setEditingParams(false) }
  }

  const launches = game.launches || []
  const notes = game.notes || []

  return (
    <div className={styles.detail}>
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div
            className={styles.heroIcon}
            style={{ background: color.bg, borderColor: color.border, color: color.accent }}
          >
            {initials(game.name)}
          </div>
          <div className={styles.heroInfo}>
            <h1 className={styles.heroName}>{game.name}</h1>
            <div className={styles.heroExec}>
              {game.exec || <span className={styles.noExec}>no executable - click edit to set path</span>}
            </div>
            <div className={styles.heroBadges}>
              <VersionBadge status={status} game={game} />
              {game.appId && (
                <span className={`${styles.badge} ${styles.badgeInfo}`}>app {game.appId}</span>
              )}
              {game.params && (
                <span className={`${styles.badge} ${styles.badgeMuted}`}>custom params</span>
              )}
              {game.elevated && (
                <span className={`${styles.badge} ${styles.badgeAmber}`}>
                  <i className="ti ti-shield" style={{ fontSize: 10 }} /> admin
                </span>
              )}
            </div>
          </div>
        </div>

        {crashInfo && (
          <div className={styles.crashBanner}>
            <div className={styles.crashLeft}>
              <i className="ti ti-alert-circle" style={{ fontSize: 16, flexShrink: 0 }} />
              <div>
                <div className={styles.crashTitle}>
                  {crashInfo.needsElevation ? 'permission denied' : 'game crashed or exited with error'}
                </div>
                <div className={styles.crashSub}>
                  {crashInfo.needsElevation
                    ? 'this game may require administrator privileges'
                    : `exit code ${crashInfo.code}${crashInfo.error ? ` — ${crashInfo.error}` : ''}`}
                </div>
              </div>
            </div>
            <div className={styles.crashActions}>
              {crashInfo.needsElevation && (
                <button
                  className={styles.crashLog}
                  style={{ borderColor: '#78350f', color: '#f59e0b' }}
                  onClick={() => {
                    setElevated(true)
                    onUpdateGame({ elevated: true })
                    setCrashInfo(null)
                    onLaunch(game, true)
                  }}
                >
                  <i className="ti ti-shield" style={{ fontSize: 11 }} />
                  relaunch as admin
                </button>
              )}
              <button className={styles.crashLog} onClick={() => setLogOpen(true)}>
                view logs
              </button>
              <button className={styles.crashDismiss} onClick={() => setCrashInfo(null)}>
                <i className="ti ti-x" />
              </button>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <div className={styles.launchGroup} ref={dropdownRef}>
            <button
              className={`${styles.btn} ${isRunning ? styles.btnRunning : styles.btnPrimary} ${styles.launchMain}`}
              onClick={() => isRunning ? onKillGame(game) : onLaunch(game, elevated)}
              disabled={!isRunning && !game.exec && !game.launchViaSteam}
              onMouseEnter={() => setHoveringLaunch(true)}
              onMouseLeave={() => setHoveringLaunch(false)}
            >
              {isRunning ? (
                hoveringLaunch ? (
                  <><i className="ti ti-square" aria-hidden="true" /> stop</>
                ) : (
                  <><i className="ti ti-activity" aria-hidden="true" /> playing</>
                )
              ) : (
                <><i className="ti ti-player-play" aria-hidden="true" /> launch</>
              )}
            </button>
            {launches.length > 0 && !isRunning && (
              <button
                className={`${styles.btn} ${styles.btnPrimary} ${styles.launchCaret}`}
                onClick={() => setDropdownOpen(o => !o)}
                aria-label="Quick launches"
              >
                <i className="ti ti-chevron-down" />
              </button>
            )}
            {dropdownOpen && (
              <LaunchDropdown
                game={game}
                onLaunchConfig={onLaunchConfig}
                onClose={() => setDropdownOpen(false)}
              />
            )}
          </div>

          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => onEdit(game)}>
            <i className="ti ti-edit" aria-hidden="true" />
            edit
          </button>
          {game.appId && (
            <>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => onOpenSteamDB(game.appId)}>
                <i className="ti ti-external-link" aria-hidden="true" />
                steamdb
              </button>
              {window.electronAPI?.platform === 'linux' && (
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => onOpenProtonDB(game.appId)}>
                <i className="ti ti-external-link" aria-hidden="true" />
                protondb
              </button>
              )}
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => onCheckVersion(game)}
                disabled={status?.state === 'checking'}
              >
                <i className={`ti ${status?.state === 'checking' ? 'ti-loader-2' : 'ti-refresh'} ${status?.state === 'checking' ? styles.spinning : ''}`} aria-hidden="true" />
                check
              </button>
            </>
          )}
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => setLogOpen(true)}
          >
            <i className="ti ti-terminal-2" aria-hidden="true" />
            logs
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.section}>
          <div className={styles.sectionLabel}>version info</div>
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>installed</div>
              <div className={`${styles.infoValue} ${status?.state === 'up-to-date' ? styles.valueGreen : status?.state === 'outdated' ? styles.valueAmber : ''}`}>
                {game.version || '—'}
              </div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>latest build (steam)</div>
              <div className={`${styles.infoValue} ${status?.state === 'up-to-date' ? styles.valueGreen : status?.state === 'outdated' ? styles.valueAmber : ''}`}>
                {status?.latestBuild || '—'}
              </div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>steam app id</div>
              <div className={`${styles.infoValue} ${styles.valueBlue}`}>{game.appId || '—'}</div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>status</div>
              <div className={`${styles.infoValue} ${status?.state === 'up-to-date' ? styles.valueGreen : status?.state === 'outdated' ? styles.valueAmber : ''}`}>
                {status?.state === 'up-to-date' ? 'up to date'
                  : status?.state === 'outdated' ? 'outdated'
                  : status?.state === 'checking' ? 'checking…'
                  : status?.state === 'error' ? 'error'
                  : status?.state === 'done' ? 'checked'
                  : 'unknown'}
              </div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>total playtime</div>
              <div className={styles.infoValue}>{formatPlaytime(game.totalPlaytime)}</div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>last played</div>
              <div className={styles.infoValue}>{game.lastPlayed ? formatLastPlayed(game.lastPlayed) : '—'}</div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            launch parameters
            {!editingParams && (
              <button className={styles.editLink} onClick={() => { setParamsVal(game.params || ''); setEditingParams(true) }}>
                <i className="ti ti-pencil" /> edit
              </button>
            )}
          </div>
          <div className={styles.paramsBox}>
            <i className="ti ti-terminal-2" aria-hidden="true" style={{ color: 'var(--text-hint)', fontSize: 14, flexShrink: 0 }} />
            {editingParams ? (
              <>
                <input
                  className={styles.paramsInput}
                  value={paramsVal}
                  onChange={e => setParamsVal(e.target.value)}
                  onKeyDown={handleParamsKey}
                  placeholder="no launch parameters"
                  autoFocus
                  spellCheck={false}
                />
                <button className={styles.paramsSave} onClick={handleParamsSave} aria-label="Save">
                  <i className="ti ti-check" />
                </button>
                <button className={styles.paramsCancel} onClick={() => setEditingParams(false)} aria-label="Cancel">
                  <i className="ti ti-x" />
                </button>
              </>
            ) : (
              <span className={styles.paramsDisplay} onClick={() => { setParamsVal(game.params || ''); setEditingParams(true) }}>
                {game.params || <span style={{ color: 'var(--text-hint)' }}>no launch parameters</span>}
              </span>
            )}
          </div>
          <div className={styles.steamLaunchRow}>
            <label className={`${styles.checkLabel} ${game.launchViaSteam ? styles.checkActive : ''}`}>
              <input
                type="checkbox"
                className={styles.checkInput}
                checked={game.launchViaSteam || false}
                onChange={e => onUpdateGame({ launchViaSteam: e.target.checked })}
              />
              <span className={styles.checkBox}>
                {game.launchViaSteam && <i className="ti ti-check" />}
              </span>
              <span>Launch via Steam for workshop support</span>
            </label>
            <span className={styles.note}> *games launched via Steam can't track playtime nor log data</span>
            {window.electronAPI?.platform === 'linux' && protonInstalls?.length > 0 && (
              <div className={styles.protonRow}>
                <div className={styles.sectionLabel} style={{ marginBottom: 6 }}>proton</div>
                {runtimeWarning && (
                  <div className={styles.runtimeWarn}>
                    <i className="ti ti-box" style={{ fontSize: 13, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 2 }}>Steam Linux Runtime required</div>
                      <div style={{ fontSize: 11, color: 'var(--text-sec)', fontWeight: 300 }}>
                        This game's manifest references the Steam Linux Runtime container. If it crashes on launch, install it via Steam.
                      </div>
                    </div>
                    <button
                      className={styles.protonRecInstall}
                      onClick={() => window.electronAPI?.openExternal('steam://install/1391110')}
                    >
                      <i className="ti ti-brand-steam" style={{ fontSize: 11 }} />
                      install
                    </button>
                  </div>
                )}
                <div className={styles.protonSelect}>
                  <i className="ti ti-flask" style={{ color: 'var(--text-hint)', fontSize: 13, flexShrink: 0 }} />
                  <CustomSelect
                    value={game.protonPath || ''}
                    onChange={val => onUpdateGame({ protonPath: val || null })}
                    options={[
                      { value: '', label: 'native (no proton)' },
                      ...protonInstalls.map(p => ({ value: p.path, label: p.name }))
                    ]}
                  />
                </div>
              </div>
            )}
            {window.electronAPI?.platform === 'linux' && (
              <div className={styles.envSection}>
                <div className={styles.sectionLabel} style={{ marginBottom: 8 }}>
                  environment variables
                </div>

                {Object.entries(game.env || {}).length === 0 && (
                  <div className={styles.envEmpty}>
                    no env vars set — common ones: DXVK_ASYNC=1, MANGOHUD=1, PROTON_NO_ESYNC=1
                  </div>
                )}

                {Object.entries(game.env || {}).map(([key, val]) => (
                  <div key={key} className={styles.envRow}>
                    <span className={styles.envKey}>{key}</span>
                    <span className={styles.envEquals}>=</span>
                    <span className={styles.envVal}>{val || '1'}</span>
                    <button
                      className={styles.envRemove}
                      onClick={() => handleRemoveEnv(key)}
                      aria-label={`Remove ${key}`}
                    >
                      <i className="ti ti-x" />
                    </button>
                  </div>
                ))}

                <div className={styles.envPresets}>
                  {[
                    { key: 'DXVK_ASYNC', val: '1', label: 'DXVK async' },
                    { key: 'MANGOHUD', val: '1', label: 'MangoHud' },
                    { key: 'PROTON_NO_ESYNC', val: '1', label: 'no esync' },
                    { key: 'PROTON_NO_FSYNC', val: '1', label: 'no fsync' },
                    { key: 'WINE_FULLSCREEN_FSR', val: '1', label: 'FSR' },
                    { key: 'PROTON_USE_WINED3D', val: '1', label: 'wined3d' },
                  ].map(preset => {
                    const active = (game.env || {})[preset.key] !== undefined
                    return (
                      <button
                        key={preset.key}
                        className={`${styles.envPreset} ${active ? styles.envPresetActive : ''}`}
                        onClick={() => {
                          if (active) {
                            handleRemoveEnv(preset.key)
                          } else {
                            onUpdateGame({ env: { ...(game.env || {}), [preset.key]: preset.val } })
                          }
                        }}
                      >
                        {active && <i className="ti ti-check" style={{ fontSize: 10 }} />}
                        {preset.label}
                      </button>
                    )
                  })}
                </div>

                <div className={styles.envAdd}>
                  <input
                    className={styles.envInput}
                    value={newEnvKey}
                    onChange={e => { setNewEnvKey(e.target.value.toUpperCase()); setEnvError(null) }}
                    onKeyDown={handleEnvKeyDown}
                    placeholder="KEY"
                    spellCheck={false}
                  />
                  <span className={styles.envEquals}>=</span>
                  <input
                    className={styles.envInput}
                    value={newEnvVal}
                    onChange={e => setNewEnvVal(e.target.value)}
                    onKeyDown={handleEnvKeyDown}
                    placeholder="value"
                    spellCheck={false}
                    style={{ flex: 2 }}
                  />
                  <button className={styles.envAddBtn} onClick={handleAddEnv}>
                    <i className="ti ti-plus" style={{ fontSize: 13 }} />
                  </button>
                </div>
                {envError && <div className={styles.envError}>{envError}</div>}
              </div>
            )}
            {window.electronAPI?.platform === 'linux' && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>storage</div>

                {storageLoading && (
                  <div className={styles.storageLoading}>
                    <i className="ti ti-loader-2" style={{ animation: 'spin 0.7s linear infinite', fontSize: 12 }} />
                    calculating…
                  </div>
                )}

                {storageInfo && !storageLoading && (
                  <div className={styles.storageGrid}>
                    <div className={styles.storageCard}>
                      <div className={styles.storageCardTop}>
                        <div className={styles.storageCardIcon}>
                          <i className="ti ti-device-desktop" />
                        </div>
                        <div className={styles.storageCardInfo}>
                          <div className={styles.storageCardLabel}>game folder</div>
                          <div className={styles.storageCardSize}>
                            {storageInfo.gameSize ? formatBytes(storageInfo.gameSize) : '—'}
                          </div>
                        </div>
                      </div>
                      {storageInfo.gamePath && (
                        <div className={styles.storageCardPath}>
                          <span>{storageInfo.gamePath}</span>
                          <button
                            className={styles.storageOpenBtn}
                            onClick={() => window.electronAPI.openFolder(storageInfo.gamePath)}
                            title="Open folder"
                          >
                            <i className="ti ti-folder-open" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={styles.storageCard}>
                      <div className={styles.storageCardTop}>
                        <div className={styles.storageCardIcon} style={storageInfo.compatExists ? {} : { opacity: 0.4 }}>
                          <i className="ti ti-database" />
                        </div>
                        <div className={styles.storageCardInfo}>
                          <div className={styles.storageCardLabel}>compat data (wine prefix)</div>
                          <div className={styles.storageCardSize}>
                            {storageInfo.compatExists ? formatBytes(storageInfo.compatSize) : 'not created yet'}
                          </div>
                        </div>
                        {storageInfo.compatExists && (
                          <button
                            className={`${styles.storageResetBtn} ${confirmReset ? styles.storageResetConfirm : ''}`}
                            onClick={() => {
                              if (confirmReset) {
                                handleResetCompat()
                              } else {
                                setConfirmReset(true)
                                setTimeout(() => setConfirmReset(false), 3000)
                              }
                            }}
                            disabled={resetting}
                            title="Reset wine prefix — fixes many game issues but wipes saves stored in the prefix"
                          >
                            {resetting
                              ? <i className="ti ti-loader-2" style={{ animation: 'spin 0.7s linear infinite' }} />
                              : confirmReset
                              ? 'confirm reset'
                              : <><i className="ti ti-trash" /> reset</>
                            }
                          </button>
                        )}
                      </div>
                      {storageInfo.compatExists && (
                        <div className={styles.storageCardPath}>
                          <span>{storageInfo.compatPath}</span>
                          <button
                            className={styles.storageOpenBtn}
                            onClick={() => window.electronAPI.openFolder(storageInfo.compatPath)}
                            title="Open folder"
                          >
                            <i className="ti ti-folder-open" />
                          </button>
                        </div>
                      )}
                      {storageInfo.compatExists && (
                        <div className={styles.storageWarning}>
                          <i className="ti ti-info-circle" style={{ fontSize: 11, flexShrink: 0 }} />
                          resetting deletes the wine prefix — any saves or settings stored inside it will be lost
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {(window.electronAPI?.platform === 'win32' || window.electronAPI?.platform === 'linux') && (
          <div className={styles.steamLaunchRow} style={{ marginTop: -12, marginBottom: 12 }}>
            <label className={`${styles.checkLabel} ${elevated ? styles.checkActive : ''}`}
              style={elevated ? { borderColor: '#78350f', background: '#120a01', color: '#f59e0b' } : {}}>
              <input
                type="checkbox"
                className={styles.checkInput}
                checked={elevated}
                onChange={e => {
                  setElevated(e.target.checked)
                  onUpdateGame({ elevated: e.target.checked })
                }}
              />
              <span className={styles.checkBox} style={elevated ? { background: '#1a0e02', borderColor: '#78350f', color: '#f59e0b' } : {}}>
                {elevated && <i className="ti ti-check" />}
              </span>
              <span>
                {window.electronAPI?.platform === 'win32' ? 'Run as administrator (UAC)' : 'Run with pkexec (elevated)'}
              </span>
            </label>
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            quick launches
            <button className={styles.editLink} onClick={() => setLaunchForm({ launch: null })}>
              <i className="ti ti-plus" /> add
            </button>
          </div>

          {launches.length === 0 && (
            <div className={styles.emptyLaunches}>
              no quick launches - add one to quickly launch with different parameters
            </div>
          )}

          {launches.map(l => (
            <div key={l.id} className={styles.launchRow}>
              <div className={styles.launchRowInfo}>
                <span className={styles.launchRowName}>{l.name}</span>
                <span className={styles.launchRowMeta}>
                  {l.viaSteam ? 'via steam' : (l.params || 'no params')}
                </span>
              </div>
              <div className={styles.launchRowActions}>
                <button
                  className={styles.launchRowBtn}
                  onClick={() => onLaunchConfig(l)}
                  title="Launch"
                >
                  <i className="ti ti-player-play" />
                </button>
                <button
                  className={styles.launchRowBtn}
                  onClick={() => setLaunchForm({ launch: l })}
                  title="Edit"
                >
                  <i className="ti ti-pencil" />
                </button>
                <button
                  className={`${styles.launchRowBtn} ${styles.launchRowBtnDanger}`}
                  onClick={() => setConfirmDelete(l.id)}
                  title="Delete"
                >
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            notes
            <button className={styles.editLink} onClick={() => setNoteForm({ note: null })}>
              <i className="ti ti-plus" /> add
            </button>
          </div>

          {notes.length === 0 && (
            <div className={styles.emptyLaunches}>
              no notes
            </div>
          )}

          {notes.map(l => (
            <div key={l.id} className={styles.launchRow}>
              <div className={styles.launchRowInfo}>
                <span className={styles.launchRowName}>{l.name}</span>
                <span className={styles.noteRowMeta}>
                  {l.content}
                </span>
              </div>
              <div className={styles.launchRowActions}>
                <button
                  className={styles.launchRowBtn}
                  onClick={() => setNoteForm({ note: l })}
                  title="Edit"
                >
                  <i className="ti ti-pencil" />
                </button>
                <button
                  className={`${styles.launchRowBtn} ${styles.launchRowBtnDanger}`}
                  onClick={() => setConfirmDeleteNote(l.id)}
                  title="Delete"
                >
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {launchForm && (
        <div className={styles.launchFormWrapper}>
          <LaunchForm
            launch={launchForm.launch}
            onSave={(data) => {
              if (launchForm.launch) {
                onUpdateLaunch(launchForm.launch.id, data)
              } else {
                onAddLaunch(data)
              }
            }}
            onClose={() => setLaunchForm(null)}
          />
        </div>
      )}

      {noteForm && (
        <div className={styles.launchFormWrapper}>
          <NoteForm
            note={noteForm.note}
            onSave={(data) => {
              if (noteForm.note) {
                onUpdateNote(noteForm.note.id, data)
              } else {
                onAddNote(data)
              }
            }}
            onClose={() => setNoteForm(null)}
          />
        </div>
      )}

      {confirmDelete && (
        <div className={styles.launchFormWrapper}>
          <div className={styles.launchFormOverlay} onClick={() => setConfirmDelete(null)}>
            <div className={styles.launchFormCard} onClick={e => e.stopPropagation()}>
              <div className={styles.launchFormHeader}>
                <span>delete launch?</span>
                <button onClick={() => setConfirmDelete(null)} className={styles.launchFormClose}><i className="ti ti-x" /></button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-sec)', padding: '8px' }}>
                This quick launch config will be permanently removed.
              </p>
              <div className={styles.launchFormActions}>
                <button className={styles.launchFormSave} style={{ background: '#1a0808', borderColor: '#7f1d1d', color: 'var(--red)' }}
                  onClick={() => { onRemoveLaunch(confirmDelete); setConfirmDelete(null) }}>
                  delete
                </button>
                <button className={styles.launchFormCancel} onClick={() => setConfirmDelete(null)}>cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteNote && (
        <div className={styles.launchFormWrapper}>
          <div className={styles.launchFormOverlay} onClick={() => setConfirmDeleteNote(null)}>
            <div className={styles.launchFormCard} onClick={e => e.stopPropagation()}>
              <div className={styles.launchFormHeader}>
                <span>delete note?</span>
                <button onClick={() => setConfirmDeleteNote(null)} className={styles.launchFormClose}><i className="ti ti-x" /></button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-sec)', padding: '8px' }}>
                This note will be permanently removed.
              </p>
              <div className={styles.launchFormActions}>
                <button className={styles.launchFormSave} style={{ background: '#1a0808', borderColor: '#7f1d1d', color: 'var(--red)' }}
                  onClick={() => { onRemoveNote(confirmDeleteNote); setConfirmDeleteNote(null) }}>
                  delete
                </button>
                <button className={styles.launchFormCancel} onClick={() => setConfirmDeleteNote(null)}>cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {logOpen && (
        <LogViewer
          game={game}
          onClose={() => setLogOpen(false)}
        />
      )}
    </div>
  )
}