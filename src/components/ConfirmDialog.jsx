import styles from './ConfirmDialog.module.css'

export default function ConfirmDialog({ message, onConfirm, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.icon}>
          <i className="ti ti-alert-triangle" />
        </div>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onClose}>cancel</button>
          <button className={styles.btnConfirm} onClick={() => { onConfirm(); onClose() }}>delete</button>
        </div>
      </div>
    </div>
  )
}