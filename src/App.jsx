import { useState, useEffect } from 'react'
import { useGames } from './hooks/useGames'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import ProtonModal from './components/ProtonModal'
import GameDetail from './components/GameDetail'
import GameForm from './components/GameForm'
import CategoryForm from './components/CategoryForm'
import ConfirmDialog from './components/ConfirmDialog'
import Toast from './components/Toast'
import styles from './App.module.css'
import SettingsModal, { PRESETS } from './components/SettingsModal'

export default function App() {
  const {
    games, loaded, statuses, toast, colors,
    addGame, updateGame, removeGame,
    launchGame, pickExec,
    setGamesOrder,
    checkVersion, openSteamDB, openProtonDB,
    showToast,
    categories,
    addCategory,
    updateCategory,
    removeCategory,
    addLaunch, updateLaunch, removeLaunch,
    addNote, updateNote, removeNote,
    protonInstalls, refreshProton,
    runningGames, killGame,
    checkAllVersions
  } = useGames()

  const [activeId, setActiveId] = useState(null)
  const [formState, setFormState] = useState(null) // null | { game: null|Game }
  const [catFormState, setCatFormState] = useState(null) // null | { category: null|Category }
  const [confirmState, setConfirmState] = useState(null) // null | { message, onConfirm }
  const [updateStatus, setUpdateStatus] = useState(null)
  const [protonOpen, setProtonOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    window.electronAPI?.getTheme?.().then(theme => {
      if (theme) applyTheme(theme)
    })
  }, [])

  useEffect(() => {
    if (!window.electronAPI?.onUpdaterStatus) return
    window.electronAPI.onUpdaterStatus((data) => {
      setUpdateStatus(data)
    })
  }, [])

  function confirm(message, onConfirm) {
    setConfirmState({ message, onConfirm })
  }

  function applyTheme(theme) {
    const root = document.documentElement
    // apply preset vars
    const preset = PRESETS[theme.preset]
    if (preset) {
      Object.entries(preset.vars).forEach(([k, v]) => root.style.setProperty(k, v))
    } else {
      // reset to defaults
      const defaultVars = ['--bg-base','--bg-surface','--bg-raised','--bg-hover','--bg-active',
        '--border-sub','--border-mid','--border-hi','--accent','--accent-hover',
        '--text-primary','--text-sec','--green','--amber','--red']
      defaultVars.forEach(k => root.style.removeProperty(k))
    }
    // apply custom overrides on top
    if (theme.custom) {
      Object.entries(theme.custom).forEach(([k, v]) => root.style.setProperty(k, v))
    }
  }

  const activeGame = games.find(g => g.id === (activeId ?? games[0]?.id)) ?? null
  const resolvedId = activeGame?.id ?? null

  function handleSelect(id) {
    setActiveId(id)
    setFormState(null)
  }

  function handleAdd() {
    setFormState({ game: null })
  }

  function handleEdit(game) {
    setFormState({ game })
  }

  function handleFormSave(data) {
    if (formState.game) {
      updateGame(formState.game.id, data)
      // check version if appId is set
      if (data.appId) {
        const updatedGame = { ...formState.game, ...data }
        setTimeout(() => checkVersion(updatedGame), 500)
      }
    } else {
      const newId = addGame(data)
      setActiveId(newId)
      // check version for new game if appId is set
      if (data.appId) {
        setTimeout(() => {
          const newGame = { id: newId, ...data }
          checkVersion(newGame)
        }, 500)
      }
    }
    setFormState(null)
  }

  function handleFormDelete(id) {
    const game = games.find(g => g.id === id)
    confirm(`Delete "${game.name}"? This can't be undone.`, () => {
      removeGame(id)
      if (resolvedId === id) setActiveId(games.find(g => g.id !== id)?.id ?? null)
      setFormState(null)
    })
  }

  if (!loaded) {
    return (
      <div className={styles.loading}>
        <i className="ti ti-loader-2" style={{ fontSize: 24, animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div className={styles.app}>
      <TitleBar />

      <div className={styles.body}>
      {updateStatus?.state === 'available' && (
        <div className={styles.updateBanner}>
          <i className="ti ti-arrow-up-circle" />
          version {updateStatus.version} available - downloading...
        </div>
      )}
      {updateStatus?.state === 'downloading' && (
        <div className={styles.updateBanner}>
          <i className="ti ti-arrow-down" />
          downloading update... {updateStatus.percent}%
          <div className={styles.updateProgress}>
            <div className={styles.updateProgressBar} style={{ width: `${updateStatus.percent}%` }} />
          </div>
        </div>
      )}
      {updateStatus?.state === 'ready' && (
        <div className={`${styles.updateBanner} ${styles.updateBannerReady}`}>
          <i className="ti ti-check" />
          update ready - restart to install
          <button onClick={() => window.electronAPI.installUpdate()}>
            restart now
          </button>
        </div>
      )}
      {updateStatus?.state === 'manual' && (
        <div className={`${styles.updateBanner} ${styles.updateBannerReady}`}>
          <i className="ti ti-arrow-up-circle" />
          update available - download manually
          <button onClick={() => window.electronAPI?.openExternal('https://clauncher.cirax.dev/#download')}>
            download
          </button>
        </div>
      )}
      
      <Sidebar
        games={games}
        activeId={resolvedId}
        statuses={statuses}
        colors={colors}
        categories={categories}
        onSelect={handleSelect}
        onAdd={handleAdd}
        onAddCategory={() => setCatFormState({ category: null })}
        onRenameCategory={(id) => setCatFormState({ category: categories.find(c => c.id === id) })}
        onRemoveCategory={(id) => {
          const cat = categories.find(c => c.id === id)
          const count = games.filter(g => g.categoryId === id).length
          confirm(
            `Delete "${cat.name}"?${count > 0 ? ` ${count} game${count > 1 ? 's' : ''} will become uncategorized.` : ''}`,
            () => removeCategory(id)
          )
        }}
        onReorderGames={(dragId, targetId) => {
          const arr = [...games]
          const from = arr.findIndex(g => g.id === dragId)
          const to = arr.findIndex(g => g.id === targetId)
          const targetCategoryId = arr[to].categoryId
          const [item] = arr.splice(from, 1)
          // update categoryId to match the target's category
          arr.splice(to, 0, { ...item, categoryId: targetCategoryId })
          setGamesOrder(arr)
        }}
        onMoveGameToCategory={(gameId, catId) => {
          updateGame(gameId, { categoryId: catId })
        }}
        onOpenProton={() => setProtonOpen(true)}
        runningGames={runningGames}
        onCheckAllVersions={checkAllVersions}
        onOpenSettings={() => setSettingsOpen(true)}
      />

        <main className={styles.main}>
          {activeGame ? (
            <GameDetail
              key={activeGame.id}
              game={activeGame}
              status={statuses[activeGame.id]}
              color={colors[activeGame.colorIndex % colors.length]}
              onLaunch={launchGame}
              onEdit={handleEdit}
              onCheckVersion={checkVersion}
              onOpenSteamDB={openSteamDB}
              onOpenProtonDB={openProtonDB}
              onUpdateGame={(data) => {
                updateGame(activeGame.id, data)
                showToast('Changes saved', 'success')
              }}
              onAddLaunch={(data) => addLaunch(activeGame.id, data)}
              onUpdateLaunch={(launchId, data) => updateLaunch(activeGame.id, launchId, data)}
              onRemoveLaunch={(launchId) => removeLaunch(activeGame.id, launchId)}
              onLaunchConfig={(config) => launchGame({ ...activeGame, params: config.params, launchViaSteam: config.viaSteam })}
              onAddNote={(data) => addNote(activeGame.id, data)}
              onUpdateNote={(noteId, data) => updateNote(activeGame.id, noteId, data)}
              onRemoveNote={(noteId) => removeNote(activeGame.id, noteId)}
              protonInstalls={protonInstalls}
              runningGames={runningGames}
              onKillGame={killGame}
            />
          ) : (
            <div className={styles.emptyMain}>
              <i className="ti ti-device-gamepad-2" aria-hidden="true" />
              <p>add a game to get started</p>
              <button className={styles.emptyAdd} onClick={handleAdd}>
                <i className="ti ti-plus" />
                add game
              </button>
            </div>
          )}

          {formState && (
            <GameForm
              game={formState.game}
              categories={categories}
              onSave={handleFormSave}
              onDelete={handleFormDelete}
              onClose={() => setFormState(null)}
              onPickExec={pickExec}
              onCheckVersion={checkVersion}
              onAddCategory={() => setCatFormState({ category: null })}
            />
          )}

          {catFormState && (
            <CategoryForm
              category={catFormState.category}
              onSave={(name) => {
                if (catFormState.category) {
                  updateCategory(catFormState.category.id, name)
                } else {
                  addCategory(name)
                }
                setCatFormState(null)
              }}
              onClose={() => setCatFormState(null)}
            />
          )}

          {confirmState && (
            <ConfirmDialog
              message={confirmState.message}
              onConfirm={confirmState.onConfirm}
              onClose={() => setConfirmState(null)}
            />
          )}

          {protonOpen && (
            <ProtonModal
              installs={protonInstalls}
              onRefresh={refreshProton}
              onClose={() => setProtonOpen(false)}
            />
          )}

          {settingsOpen && (
            <SettingsModal
              onClose={() => setSettingsOpen(false)}
              onThemeChange={applyTheme}
            />
          )}
        </main>
      </div>

      <Toast toast={toast} />
    </div>
  )
}
