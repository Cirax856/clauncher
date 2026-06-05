import { useState, useEffect, useRef } from 'react'
import styles from './GameForm.module.css'

function CustomSelect({ value, onChange, options, onAddNew }) {
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
        <span>{selected.label}</span>
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
          {onAddNew && (
            <>
              <div className={styles.selectDivider} />
              <button
                type="button"
                className={styles.selectOptionAdd}
                onClick={() => {
                  setOpen(false)
                  onAddNew()
                }}
              >
                <i className="ti ti-folder-plus" style={{ fontSize: 14 }} />
                Create new
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const EMPTY = { name: '', exec: '', params: '', version: '', appId: '', launchViaSteam: false, categoryId: null }

export default function GameForm({ game, categories, onSave, onDelete, onClose, onPickExec, onCheckVersion, onAddCategory }) {
  const [form, setForm] = useState(() => game ? { ...EMPTY, ...game } : { ...EMPTY })
  const [picking, setPicking] = useState(false)
  const [appIdSuggestion, setAppIdSuggestion] = useState(null)
  const [suggesting, setSuggesting] = useState(false)
  const searchTimer = useRef(null)

  useEffect(() => {
    setForm(game ? { ...EMPTY, ...game } : { ...EMPTY })
    setAppIdSuggestion(null)
  }, [game])

  function handleNameChange(val) {
    setForm(prev => ({ ...prev, name: val }))
    setAppIdSuggestion(null)
    clearTimeout(searchTimer.current)
    if (val.trim().length < 3) return
    setSuggesting(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const isDev = window.location.href.includes('localhost')
        const searchRes = await fetch(isDev ? `/search-appid/${encodeURIComponent(val)}` : `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(val)}`)
        const searchData = await searchRes.json()
        if (!searchData?.length) return
        const bestMatch = searchData[0]
        const infoRes = await fetch(`https://api.steamcmd.net/v1/info/${String(bestMatch.appid)}`)
        const infoData = await infoRes.json()
        const latestBuild = infoData?.data?.[bestMatch.appid]?.depots?.branches?.public?.buildid;
        setAppIdSuggestion({
          appid: String(bestMatch.appid),
          latest: latestBuild ? String(latestBuild) : '',
          name: bestMatch.name
        })
      } catch (err) {
        console.log(err)
      } finally {
        setSuggesting(false)
      }
    }, 500)
  }

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handlePickExec() {
    setPicking(true)
    const path = await onPickExec()
    if (path) set('exec', path)
    setPicking(false)
  }

  function handleSave() {
    if (!form.name.trim()) return
    onSave(form)
  }

  function handleKey(e) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className={styles.overlay} onClick={e => {
      if (e.target === e.currentTarget) onClose()
    }} onKeyDown={handleKey}>
      <div className={styles.card} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={game ? 'Edit game' : 'Add game'}>
        <div className={styles.header}>
          <span className={styles.title}>{game ? 'edit game' : 'add game'}</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>

        <div className={styles.fields}>
          <Field label="game name" required>
            <input
              value={form.name ?? ''}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Game Title"
              autoFocus
            />
          </Field>

          <Field label="executable path">
            <div className={styles.execRow}>
              <input
                value={form.exec}
                onChange={e => set('exec', e.target.value)}
                placeholder="/path/to/game.exe"
                className={styles.execInput}
              />
              <button className={styles.browseBtn} onClick={handlePickExec} disabled={picking}>
                <i className={`ti ${picking ? 'ti-loader-2' : 'ti-folder-open'} ${picking ? styles.spin : ''}`} />
                browse
              </button>
            </div>
          </Field>

          <Field label="launch parameters">
            <input
              value={form.params}
              onChange={e => set('params', e.target.value)}
              placeholder="-novid -high -tickrate 128"
              className={styles.mono}
            />
          </Field>

          <Field label="launch via steam">
            <label className={`${styles.checkLabel} ${form.launchViaSteam ? styles.checkActive : ''}`}>
              <input
                type="checkbox"
                className={styles.checkInput}
                checked={form.launchViaSteam || false}
                onChange={e => set('launchViaSteam', e.target.checked)}
              />
              <span className={styles.checkBox}>
                {form.launchViaSteam && <i className="ti ti-check" />}
              </span>
              <span>Launch via Steam for workshop support</span>
            </label>
          </Field>

          <Field label="category">
            <CustomSelect
              value={form.categoryId}
              onChange={val => set('categoryId', val)}
              options={[
                { value: null, label: 'uncategorized' },
                ...categories.map(c => ({ value: c.id, label: c.name }))
              ]}
              onAddNew={onAddCategory}
            />
          </Field>

          <div className={styles.row2}>
            <Field label="installed build">
              <input
                value={form.version ?? ''}
                onChange={e => set('version', e.target.value)}
                placeholder="Empty to not check"
                className={styles.mono}
              />
            </Field>
            <Field label="steam app id">
              <input
                id="ff-appid"
                value={form.appId ?? ''}
                onChange={e => set('appId', e.target.value)}
                placeholder="730"
                className={styles.mono}
              />
            </Field>
            {suggesting && (
                <div className={styles.suggestion}>
                  <i className="ti ti-loader-2" style={{ animation: 'spin 0.7s linear infinite', fontSize: 12 }} />
                  searching steam…
                </div>
              )}
              {appIdSuggestion && !suggesting && (
                <button
                  type="button"
                  className={styles.suggestion}
                  onClick={() => {
                    set('appId', appIdSuggestion.appid)
                    set('name', appIdSuggestion.name)
                    if (appIdSuggestion.latest) set('version', appIdSuggestion.latest)
                    setAppIdSuggestion(null)
                  }}
                >
                  <i className="ti ti-brand-steam" style={{ fontSize: 12 }} />
                  use <strong>{appIdSuggestion.appid}</strong> — {appIdSuggestion.name}
                  <i className="ti ti-arrow-right" style={{ marginLeft: 'auto', fontSize: 12 }} />
                </button>
              )}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnSave} onClick={handleSave} disabled={!form.name.trim()}>
            save
          </button>
          <button className={styles.btnCancel} onClick={onClose}>
            cancel
          </button>
          {game && (
            <button className={styles.btnDelete} onClick={() => onDelete(game.id)}>
              <i className="ti ti-trash" />
              remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>
      {children}
    </div>
  )
}
