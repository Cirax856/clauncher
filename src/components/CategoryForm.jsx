import { useState, useEffect } from 'react'
import styles from './GameForm.module.css'

export default function CategoryForm({ category, onSave, onClose }) {
  const [name, setName] = useState(category?.name || '')

  useEffect(() => {
    setName(category?.name || '')
  }, [category])

  function handleSave() {
    if (!name.trim()) return
    onSave(name.trim())
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className={styles.overlay} onClick={e => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <div className={styles.card} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <span className={styles.title}>{category ? 'rename category' : 'new category'}</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>
        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Steam Games"
              autoFocus
            />
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnSave} onClick={handleSave} disabled={!name.trim()}>
            save
          </button>
          <button className={styles.btnCancel} onClick={onClose}>
            cancel
          </button>
        </div>
      </div>
    </div>
  )
}