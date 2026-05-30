import { useState, useRef } from 'react'
import styles from './Sidebar.module.css'

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase()
}

function StatusDot({ status }) {
  if (status?.state === 'outdated') {
    return (
      <span className={styles.outdatedWarn} title="Update available">
        <i className="ti ti-alert-triangle" />
      </span>
    )
  }
  const cls = status?.state === 'up-to-date' ? styles.dotGreen
    : status?.state === 'checking' ? styles.dotBlue
    : status?.state === 'error' ? styles.dotRed
    : styles.dotIdle
  return <span className={`${styles.dot} ${cls}`} />
}

function GameItem({ game, active, status, color, onSelect, onDragStart, onDragEnd, isDragging }) {
  return (
    <button
      className={`${styles.item} ${active ? styles.active : ''} ${isDragging ? styles.dragging : ''}`}
      onClick={() => onSelect(game.id)}
      draggable
      onDragStart={e => onDragStart(e, game)}
      onDragEnd={onDragEnd}
      role="option"
      aria-selected={active}
    >
      <i className={`ti ti-grip-vertical ${styles.dragHandle}`} aria-hidden="true" />
      <div
        className={styles.icon}
        style={{
          background: color.bg,
          borderColor: color.border,
          color: color.accent,
          fontSize: initials(game.name).length > 2 ? 9 : 11,
        }}
      >
        {initials(game.name)}
      </div>
      <div className={styles.meta}>
        <span className={styles.name}>{game.name}</span>
        <span className={styles.ver}>{game.version || 'no version'}</span>
      </div>
      <StatusDot status={status} />
    </button>
  )
}

function CategorySection({ category, games, activeId, statuses, colors, onSelect, onRename, onRemove, onDragStart, onDragEnd, onDropOnCategory, onDropOnGame, dragOverCatId, dragOverGameId, draggingGame }) {
  const [collapsed, setCollapsed] = useState(false)
  const [hovering, setHovering] = useState(false)
  const isDropTarget = dragOverCatId === category.id && draggingGame?.categoryId !== category.id

  return (
    <div className={styles.categorySection}>
      <div
        className={`${styles.categoryHeader} ${isDropTarget ? styles.categoryHeaderDropTarget : ''}`}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onDragOver={e => { e.preventDefault(); onDropOnCategory(category.id, 'over') }}
        onDragLeave={() => onDropOnCategory(null, 'leave')}
        onDrop={e => { e.preventDefault(); onDropOnCategory(category.id, 'drop') }}
      >
        <button className={styles.categoryToggle} onClick={() => setCollapsed(c => !c)}>
          <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} />
          <span>{category.name}</span>
          <span className={styles.categoryCount}>{games.length}</span>
        </button>
        {hovering && !draggingGame && (
          <div className={styles.categoryActions}>
            <button onClick={() => onRename(category.id)} aria-label="Rename" title="Rename">
              <i className="ti ti-pencil" />
            </button>
            <button onClick={() => onRemove(category.id)} aria-label="Remove" title="Remove">
              <i className="ti ti-trash" />
            </button>
          </div>
        )}
      </div>
      {!collapsed && games.map((g, idx) => (
        <div
          key={g.id}
          className={`${styles.dropZone} ${dragOverGameId === g.id ? styles.dropZoneActive : ''}`}
          onDragOver={e => { e.preventDefault(); onDropOnGame(g.id, 'over') }}
          onDragLeave={() => onDropOnGame(null, 'leave')}
          onDrop={e => { e.preventDefault(); onDropOnGame(g.id, 'drop') }}
        >
          <GameItem
            game={g}
            active={g.id === activeId}
            status={statuses[g.id]}
            color={colors[g.colorIndex % colors.length]}
            onSelect={onSelect}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggingGame?.id === g.id}
          />
        </div>
      ))}
    </div>
  )
}

export default function Sidebar({ games, activeId, statuses, colors, categories, onSelect, onAdd, onAddCategory, onRenameCategory, onRemoveCategory, onReorderGames, onMoveGameToCategory, onOpenProton }) {
  const [query, setQuery] = useState('')
  const [draggingGame, setDraggingGame] = useState(null)
  const [dragOverCatId, setDragOverCatId] = useState(null)
  const [dragOverGameId, setDragOverGameId] = useState(null)

  const filtered = games.filter(g =>
    g.name.toLowerCase().includes(query.toLowerCase())
  )

  const grouped = categories.map(cat => ({
    category: cat,
    games: filtered.filter(g => g.categoryId === cat.id),
  }))

  const uncategorized = filtered.filter(g => !g.categoryId)

  function handleDragStart(e, game) {
    setDraggingGame(game)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDraggingGame(null)
    setDragOverCatId(null)
    setDragOverGameId(null)
  }

  function handleDropOnCategory(catId, action) {
    if (action === 'over') {
      setDragOverCatId(catId)
    } else if (action === 'leave') {
      setDragOverCatId(null)
    } else if (action === 'drop' && draggingGame) {
      onMoveGameToCategory(draggingGame.id, catId)
      handleDragEnd()
    }
  }
  
  function handleDropOnGame(gameId, action) {
    if (action === 'over') {
      setDragOverGameId(gameId)
    } else if (action === 'leave') {
      setDragOverGameId(null)
    } else if (action === 'drop' && draggingGame && gameId !== draggingGame.id) {
      onReorderGames(draggingGame.id, gameId)
      handleDragEnd()
    }
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.top}>
        <div className={styles.search}>
          <i className="ti ti-search" aria-hidden="true" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="search library…"
            spellCheck={false}
          />
          {query && (
            <button className={styles.clearSearch} onClick={() => setQuery('')} aria-label="Clear">
              <i className="ti ti-x" />
            </button>
          )}
        </div>
      </div>

      <div className={styles.list} role="listbox" aria-label="Games">
        {filtered.length === 0 && (
          <div className={styles.empty}>no results</div>
        )}

        {grouped.map(({ category, games: catGames }) => (
          catGames.length > 0 || !query ? (
            <CategorySection
              key={category.id}
              category={category}
              games={catGames}
              activeId={activeId}
              statuses={statuses}
              colors={colors}
              onSelect={onSelect}
              onRename={onRenameCategory}
              onRemove={onRemoveCategory}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDropOnCategory={handleDropOnCategory}
              onDropOnGame={handleDropOnGame}
              dragOverCatId={dragOverCatId}
              dragOverGameId={dragOverGameId}
              draggingGame={draggingGame}
            />
          ) : null
        ))}

        {uncategorized.length > 0 && (
          <div
            className={styles.categorySection}
            onDragOver={e => { e.preventDefault(); setDragOverCatId('uncategorized') }}
            onDragLeave={() => setDragOverCatId(null)}
            onDrop={e => {
              e.preventDefault()
              if (draggingGame) onMoveGameToCategory(draggingGame.id, null)
              setDragOverCatId(null)
            }}
          >
            {categories.length > 0 && (
              <div className={styles.categoryHeader}>
                <button className={styles.categoryToggle} style={{ pointerEvents: 'none' }}>
                  <span style={{ color: 'var(--text-hint)' }}>uncategorized</span>
                  <span className={styles.categoryCount}>{uncategorized.length}</span>
                </button>
              </div>
            )}
            {uncategorized.map(g => (
              <div
                key={g.id}
                className={`${styles.dropZone} ${dragOverGameId === g.id ? styles.dropZoneActive : ''}`}
                onDragOver={e => { e.preventDefault(); handleDropOnGame(g.id, 'over') }}
                onDragLeave={() => handleDropOnGame(null, 'leave')}
                onDrop={e => { e.preventDefault(); handleDropOnGame(g.id, 'drop') }}
              >
                <GameItem
                  game={g}
                  active={g.id === activeId}
                  status={statuses[g.id]}
                  color={colors[g.colorIndex % colors.length]}
                  onSelect={onSelect}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isDragging={draggingGame?.id === g.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <button className={styles.addBtn} onClick={onAdd}>
          <i className="ti ti-plus" aria-hidden="true" />
          add game
        </button>
        <button className={styles.addCatBtn} onClick={onAddCategory} title="Add category">
          <i className="ti ti-folder-plus" aria-hidden="true" />
        </button>
        {window.electronAPI?.platform === 'linux' && (
          <button className={styles.addCatBtn} onClick={onOpenProton} title="Proton manager">
            <i className="ti ti-flask" aria-hidden="true" />
          </button>
        )}
      </div>
    </aside>
  )
}