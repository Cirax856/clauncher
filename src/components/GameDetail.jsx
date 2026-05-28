import { useState, useRef, useEffect } from 'react'
import styles from './GameDetail.module.css'

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
              placeholder="Competitive"
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

export default function GameDetail({ game, status, color, onLaunch, onEdit, onCheckVersion, onOpenSteamDB, onUpdateGame, onAddLaunch, onUpdateLaunch, onRemoveLaunch, onLaunchConfig }) {
  const [editingParams, setEditingParams] = useState(false)
  const [paramsVal, setParamsVal] = useState(game.params || '')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [launchForm, setLaunchForm] = useState(null) // null | { launch: null|Launch }
  const [confirmDelete, setConfirmDelete] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (!dropdownRef.current?.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleParamsSave() {
    onUpdateGame({ params: paramsVal })
    setEditingParams(false)
  }

  function handleParamsKey(e) {
    if (e.key === 'Enter') handleParamsSave()
    if (e.key === 'Escape') { setParamsVal(game.params || ''); setEditingParams(false) }
  }

  const launches = game.launches || []

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
              {game.exec || <span className={styles.noExec}>no executable — click edit to set path</span>}
            </div>
            <div className={styles.heroBadges}>
              <VersionBadge status={status} game={game} />
              {game.appId && (
                <span className={`${styles.badge} ${styles.badgeInfo}`}>app {game.appId}</span>
              )}
              {game.params && (
                <span className={`${styles.badge} ${styles.badgeMuted}`}>custom params</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <div className={styles.launchGroup} ref={dropdownRef}>
            <button
              className={`${styles.btn} ${styles.btnPrimary} ${styles.launchMain}`}
              onClick={() => onLaunch(game)}
              disabled={!game.exec && !game.launchViaSteam}
            >
              <i className="ti ti-player-play" aria-hidden="true" />
              launch
            </button>
            {launches.length > 0 && (
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
          </div>
        </div>

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

      {confirmDelete && (
        <div className={styles.launchFormWrapper}>
          <div className={styles.launchFormOverlay} onClick={() => setConfirmDelete(null)}>
            <div className={styles.launchFormCard} onClick={e => e.stopPropagation()}>
              <div className={styles.launchFormHeader}>
                <span>delete launch?</span>
                <button onClick={() => setConfirmDelete(null)} className={styles.launchFormClose}><i className="ti ti-x" /></button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-sec)', padding: '8px 0 4px' }}>
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
    </div>
  )
}