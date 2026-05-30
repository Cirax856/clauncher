import ProtonPanel from './ProtonPanel'
import styles from './ProtonModal.module.css'

export default function ProtonModal({ installs, onRefresh, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <i className="ti ti-flask" style={{ fontSize: 15, color: 'var(--text-hint)' }} />
            <span className={styles.title}>Proton Manager</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div className={styles.body}>
          <ProtonPanel
            installs={installs}
            onRefresh={onRefresh}
            onOpenFolder={() => window.electronAPI?.openProtonFolder()}
            modal
          />
        </div>
      </div>
    </div>
  )
}