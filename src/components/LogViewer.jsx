import { useState, useEffect, useRef } from 'react'
import styles from './LogViewer.module.css'

export default function LogViewer({ game, onClose }) {
  const [lines, setLines] = useState([])
  const [tab, setTab] = useState('live') // 'live' | 'proton'
  const [protonLog, setProtonLog] = useState(null)
  const [protonLoading, setProtonLoading] = useState(false)
  const [filter, setFilter] = useState('all') // 'all' | 'err' | 'info'
  const [search, setSearch] = useState('')
  const bottomRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const gameKey = game.appId || game.name

  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.getLogs(gameKey).then(data => {
      if (data?.lines) setLines(data.lines)
    })

    const unsub = window.electronAPI.onGameLog(gameKey, (entry) => {
      setLines(prev => [...prev, entry])
    })

    return () => unsub?.()
  }, [gameKey])

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [lines, autoScroll])

  async function loadProtonLog() {
    setProtonLoading(true)
    const log = await window.electronAPI.getProtonLog({ appId: game.appId, name: game.name })
    setProtonLog(log)
    setProtonLoading(false)
  }

  useEffect(() => {
    if (tab === 'proton') loadProtonLog()
  }, [tab])

  function handleCopy() {
    const text = lines.map(l => `[${new Date(l.time).toISOString()}] ${l.line}`).join('\n')
    navigator.clipboard.writeText(text)
  }

  function handleClear() {
    window.electronAPI?.clearLogs(gameKey)
    setLines([])
  }

  const filtered = lines.filter(l => {
    if (filter === 'err' && l.type !== 'err') return false
    if (filter === 'info' && l.type !== 'info') return false
    if (search && !l.line.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const errCount = lines.filter(l => l.type === 'err').length

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <i className="ti ti-terminal-2" style={{ fontSize: 15, color: 'var(--text-hint)' }} />
            <span className={styles.title}>logs — {game.name}</span>
            {errCount > 0 && (
              <span className={styles.errBadge}>{errCount} error{errCount > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className={styles.headerRight}>
            <button className={styles.iconBtn} onClick={handleCopy} title="Copy all">
              <i className="ti ti-copy" />
            </button>
            <button className={styles.iconBtn} onClick={handleClear} title="Clear">
              <i className="ti ti-trash" />
            </button>
            <button className={styles.iconBtn} onClick={onClose} title="Close">
              <i className="ti ti-x" />
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'live' ? styles.tabActive : ''}`}
              onClick={() => setTab('live')}
            >
              live output
            </button>
            <button
              className={`${styles.tab} ${tab === 'proton' ? styles.tabActive : ''}`}
              onClick={() => setTab('proton')}
            >
              proton.log
            </button>
          </div>
          {tab === 'live' && (
            <div className={styles.toolbarRight}>
              <input
                className={styles.searchInput}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="filter…"
                spellCheck={false}
              />
              <div className={styles.filterBtns}>
                {['all', 'err', 'info'].map(f => (
                  <button
                    key={f}
                    className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <label className={styles.autoScrollLabel}>
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={e => setAutoScroll(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <span className={`${styles.autoScrollToggle} ${autoScroll ? styles.autoScrollActive : ''}`}>
                  auto-scroll
                </span>
              </label>
            </div>
          )}
        </div>

        <div className={styles.body}>
          {tab === 'live' && (
            <>
              {lines.length === 0 && (
                <div className={styles.empty}>
                  <i className="ti ti-player-play" style={{ fontSize: 24, marginBottom: 8 }} />
                  <p>no output yet — launch the game to see logs</p>
                </div>
              )}
              {filtered.map((l, i) => (
                <div key={i} className={`${styles.line} ${styles[`line_${l.type}`]}`}>
                  <span className={styles.lineTime}>
                    {new Date(l.time).toISOString().slice(11, 23)}
                  </span>
                  <span className={styles.lineType}>{l.type}</span>
                  <span className={styles.lineText}>{l.line}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </>
          )}

          {tab === 'proton' && (
            <>
              {protonLoading && (
                <div className={styles.empty}>
                  <i className="ti ti-loader-2" style={{ fontSize: 24, animation: 'spin 0.7s linear infinite', marginBottom: 8 }} />
                  <p>reading proton.log…</p>
                </div>
              )}
              {!protonLoading && !protonLog && (
                <div className={styles.empty}>
                  <i className="ti ti-file-off" style={{ fontSize: 24, marginBottom: 8 }} />
                  <p>no proton.log found — make sure PROTON_LOG=1 is set and the game has been launched</p>
                </div>
              )}
              {!protonLoading && protonLog && (
                <>
                  <div className={styles.protonLogPath}>{protonLog.path}</div>
                  {protonLog.content.split('\n').map((line, i) => (
                    <div key={i} className={`${styles.line} ${line.toLowerCase().includes('error') || line.toLowerCase().includes('err:') ? styles.line_err : line.toLowerCase().includes('warn') ? styles.line_warn : styles.line_out}`}>
                      <span className={styles.lineNum}>{i + 1}</span>
                      <span className={styles.lineText}>{line}</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}