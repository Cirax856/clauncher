import styles from './TitleBar.module.css'

export default function TitleBar() {
  const api = window.electronAPI

  return (
    <div className={styles.bar}>
      <span className={styles.title}>CLauncher</span>
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