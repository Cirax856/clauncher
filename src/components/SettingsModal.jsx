import { useState, useEffect } from 'react'
import styles from './SettingsModal.module.css'

const PRESETS = {
  default: {
    label: 'Default',
    vars: {},
  },
  midnight: {
    label: 'Midnight',
    vars: {
      '--bg-base':     '#050508',
      '--bg-surface':  '#09090e',
      '--bg-raised':   '#0f0f18',
      '--bg-hover':    '#14141f',
      '--bg-active':   '#191926',
      '--border-sub':  '#14141e',
      '--border-mid':  '#1e1e2e',
      '--border-hi':   '#28283e',
      '--accent':      '#7c3aed',
      '--accent-hover':'#8b5cf6',
    },
  },
  forest: {
    label: 'Forest',
    vars: {
      '--bg-base':     '#060a06',
      '--bg-surface':  '#0a0f0a',
      '--bg-raised':   '#0f160f',
      '--bg-hover':    '#141f14',
      '--bg-active':   '#192619',
      '--border-sub':  '#141e14',
      '--border-mid':  '#1e2e1e',
      '--border-hi':   '#283e28',
      '--accent':      '#16a34a',
      '--accent-hover':'#22c55e',
    },
  },
  rose: {
    label: 'Rose',
    vars: {
      '--bg-base':     '#0a0608',
      '--bg-surface':  '#0f090c',
      '--bg-raised':   '#160f12',
      '--bg-hover':    '#1f1418',
      '--bg-active':   '#261920',
      '--border-sub':  '#1e1418',
      '--border-mid':  '#2e1e24',
      '--border-hi':   '#3e2830',
      '--accent':      '#e11d48',
      '--accent-hover':'#f43f5e',
    },
  },
  slate: {
    label: 'Slate',
    vars: {
      '--bg-base':     '#070810',
      '--bg-surface':  '#0c0d18',
      '--bg-raised':   '#111220',
      '--bg-hover':    '#161828',
      '--bg-active':   '#1b1d30',
      '--border-sub':  '#161828',
      '--border-mid':  '#202338',
      '--border-hi':   '#2a2e48',
      '--accent':      '#3b82f6',
      '--accent-hover':'#60a5fa',
    },
  },
}

const CUSTOM_VARS = [
  { key: '--bg-base',      label: 'Base background' },
  { key: '--bg-surface',   label: 'Surface background' },
  { key: '--bg-raised',    label: 'Raised background' },
  { key: '--border-mid',   label: 'Border' },
  { key: '--text-primary', label: 'Primary text' },
  { key: '--text-sec',     label: 'Secondary text' },
  { key: '--accent',       label: 'Accent color' },
  { key: '--accent-hover', label: 'Accent hover' },
  { key: '--green',        label: 'Green' },
  { key: '--amber',        label: 'Amber' },
  { key: '--red',          label: 'Red' },
]

export default function SettingsModal({ onClose, onThemeChange }) {
  const [tab, setTab] = useState('general')
  const [startup, setStartup] = useState(false)
  const [startupLoading, setStartupLoading] = useState(true)
  const [selectedPreset, setSelectedPreset] = useState('default')
  const [customVars, setCustomVars] = useState({})
  const [themeLoading, setThemeLoading] = useState(true)

  useEffect(() => {
    window.electronAPI?.getStartup?.().then(v => {
      setStartup(v)
      setStartupLoading(false)
    })
    window.electronAPI?.getTheme?.().then(theme => {
      if (theme?.preset) setSelectedPreset(theme.preset)
      if (theme?.custom) setCustomVars(theme.custom)
      setThemeLoading(false)
    })
  }, [])

  async function handleStartupToggle(val) {
    setStartup(val)
    await window.electronAPI?.setStartup?.(val)
  }

  async function handlePreset(presetKey) {
    setSelectedPreset(presetKey)
    const theme = { preset: presetKey, custom: customVars }
    await window.electronAPI?.setTheme?.(theme)
    onThemeChange(theme)
  }

  async function handleCustomVar(key, val) {
    const next = { ...customVars, [key]: val }
    setCustomVars(next)
    const theme = { preset: selectedPreset, custom: next }
    await window.electronAPI?.setTheme?.(theme)
    onThemeChange(theme)
  }

  async function handleResetTheme() {
    setSelectedPreset('default')
    setCustomVars({})
    const theme = { preset: 'default', custom: {} }
    await window.electronAPI?.setTheme?.(theme)
    onThemeChange(theme)
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={styles.modal} onMouseDown={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>settings</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'general' ? styles.tabActive : ''}`}
              onClick={() => setTab('general')}
            >
              <i className="ti ti-settings" />
              general
            </button>
            <button
              className={`${styles.tab} ${tab === 'appearance' ? styles.tabActive : ''}`}
              onClick={() => setTab('appearance')}
            >
              <i className="ti ti-palette" />
              appearance
            </button>
          </div>

          <div className={styles.content}>
            {tab === 'general' && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>startup</div>
                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <div className={styles.settingName}>launch on startup</div>
                    <div className={styles.settingDesc}>
                      automatically start CLauncher when you log in
                    </div>
                  </div>
                  <label className={`${styles.toggle} ${startup ? styles.toggleOn : ''}`}>
                    <input
                      type="checkbox"
                      checked={startup}
                      disabled={startupLoading}
                      onChange={e => handleStartupToggle(e.target.checked)}
                      style={{ display: 'none' }}
                    />
                    <span className={styles.toggleThumb} />
                  </label>
                </div>
              </div>
            )}

            {tab === 'appearance' && !themeLoading && (
              <>
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>presets</div>
                  <div className={styles.presets}>
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        className={`${styles.preset} ${selectedPreset === key ? styles.presetActive : ''}`}
                        onClick={() => handlePreset(key)}
                        style={{
                          background: preset.vars['--bg-surface'] || '#0f0f11',
                          borderColor: selectedPreset === key
                            ? (preset.vars['--accent'] || '#2563eb')
                            : (preset.vars['--border-mid'] || '#242428'),
                        }}
                      >
                        <div className={styles.presetSwatch}>
                          <div style={{ background: preset.vars['--bg-base'] || '#0a0a0c', flex: 1 }} />
                          <div style={{ background: preset.vars['--accent'] || '#2563eb', width: 12 }} />
                        </div>
                        <span className={styles.presetLabel}>{preset.label}</span>
                        {selectedPreset === key && (
                          <i className="ti ti-check" style={{ fontSize: 11, color: preset.vars['--accent'] || '#2563eb' }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles.sectionLabel}>
                    custom colors
                    <button className={styles.resetBtn} onClick={handleResetTheme}>
                      <i className="ti ti-rotate" style={{ fontSize: 11 }} />
                      reset
                    </button>
                  </div>
                  <div className={styles.colorGrid}>
                    {CUSTOM_VARS.map(({ key, label }) => {
                      const presetVal = PRESETS[selectedPreset]?.vars[key]
                      const defaultVal = getComputedStyle(document.documentElement).getPropertyValue(key).trim()
                      const currentVal = customVars[key] || presetVal || defaultVal
                      return (
                        <div key={key} className={styles.colorRow}>
                          <label className={styles.colorLabel}>{label}</label>
                          <div className={styles.colorInputWrap}>
                            <input
                              type="color"
                              value={currentVal || '#000000'}
                              onChange={e => handleCustomVar(key, e.target.value)}
                              className={styles.colorInput}
                            />
                            <span className={styles.colorHex}>{currentVal}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { PRESETS }