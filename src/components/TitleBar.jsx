import { useEffect, useState } from 'react'
import styles from './TitleBar.module.css'

export default function TitleBar() {
  const api = window.electronAPI
  const platform = api?.platform || 'win32'
  const [version, setVersion] = useState('')

  useEffect(() => {
    api?.getVersion?.().then(v => setVersion(`v${v}`))
  })

  if (platform === 'linux') return null

  if (platform === 'darwin') {
    return (
      <div className={styles.barMac}>
        <span className={styles.titleMac}>
          CLauncher {version && <span className={styles.version}>{version}</span>}
        </span>
      </div>
    )
  }

  return (
    <div className={styles.bar}>
      <span className={styles.title}>CLauncher {version && <span className={styles.version}>{version}</span>}</span>
      <div className={styles.controls}>
        <button className={styles.ctrl} onClick={() => api?.minimize()} aria-label="Minimize">
          <i className="ti ti-minus" />
        </button>
        <button className={styles.ctrl} onClick={() => api?.maximize()} aria-label="Maximize">
          <i className="ti ti-square" />
        </button>
        <button className={`${styles.ctrl} ${styles.ctrlClose}`} onClick={() => api?.close()} aria-label="Close">
          <i className="ti ti-x" />
        </button>
      </div>
    </div>
  )
}