# CLauncher

A minimal, modern desktop game launcher with SteamDB version checking.
Built with **Electron + React + Vite**.

## Features

- Custom game library with any executable, launch params, version tracking
- Inline param editing - click the params field to edit in-place
- SteamDB version check via SteamCMD public API
- Persistent storage via electron-store (no database needed)
- Native file picker for executables
- Frameless window with custom titlebar

## Setup

```bash
npm install
npm run dev        # Electron + Vite hot reload
npm run dist       # Build installer to release/
```

## Project structure

```
electron/
  main.js       # Window, IPC, game launching, version checking
  preload.js    # Context bridge

src/
  hooks/useGames.js           # All state + logic
  components/TitleBar.jsx
  components/Sidebar.jsx      # Searchable game list
  components/GameDetail.jsx   # Hero panel, version cards, inline params
  components/GameForm.jsx     # Add/edit modal with file picker
  components/Toast.jsx
  App.jsx
```

## Version checking

Hits `https://api.steamcmd.net/v1/info/{appId}` for the latest public build ID.
Set your installed version manually in the edit form; the app compares build IDs.

Find App IDs on [steamdb.info](https://www.steamdb.info).

## Data location

- Windows: `%APPDATA%\clauncher\config.json`
- Linux: `~/.config/clauncher/config.json`
- macOS: `~/Library/Application Support/clauncher/config.json`
