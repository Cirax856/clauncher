import styles from './Toast.module.css'

export default function Toast({ toast }) {
  if (!toast) return null

  const cls = toast.type === 'success' ? styles.success
    : toast.type === 'error' ? styles.error
    : styles.info

  return (
    <div className={`${styles.toast} ${cls}`} role="status" aria-live="polite">
      <i className={`ti ${toast.type === 'success' ? 'ti-check' : toast.type === 'error' ? 'ti-alert-circle' : 'ti-info-circle'}`} />
      {toast.msg}
    </div>
  )
}
