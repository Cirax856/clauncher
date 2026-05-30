import { useState, useEffect } from 'react'
import styles from './ProtonPanel.module.css'

const VERSION_INFO = {
  experimental: {
    label: 'experimental',
    color: '#f59e0b',
    bg: '#120a01',
    border: '#78350f',
    desc: "Valve's bleeding edge build. Gets fixes before stable but can be buggy. Try this if the stable version doesn't work.",
    rec: 'new/broken games',
  },
  'experimental-legacy': {
    label: 'legacy snapshot',
    color: '#6b7280',
    bg: '#0a0a0b',
    border: '#374151',
    desc: 'A frozen older snapshot of Proton Experimental kept for compatibility. Not actively updated — use Proton Experimental instead.',
    rec: 'avoid',
  },
  ge: {
    label: 'GE-Proton',
    color: '#10b981',
    bg: '#021007',
    border: '#065f46',
    desc: 'Community build by GloriousEggroll with extra patches. Best for video cutscenes, anime games, and anything broken on official Proton.',
    rec: 'recommended',
  },
  stable: {
    label: 'stable',
    color: '#60a5fa',
    bg: '#03060f',
    border: '#1e3a8a',
    desc: 'Official stable release from Valve. Well tested and reliable. Use this as your default.',
    rec: 'default',
  },
  next: {
    label: 'next',
    color: '#8b5cf6',
    bg: '#08040f',
    border: '#4c1d95',
    desc: 'Preview of the next stable Proton version. More stable than Experimental but still in testing.',
    rec: 'preview',
  },
}

function getVersionType(name) {
  const n = name.toLowerCase()
  if (n.includes('ge-proton') || n.includes('proton-ge')) return 'ge'
  if (n.includes('next')) return 'next'
  if (n.startsWith('proton -') || n.startsWith('proton-')) return 'experimental-legacy'
  if (n.includes('experimental')) return 'experimental'
  return 'stable'
}

function ProtonItem({ install }) {
  const [expanded, setExpanded] = useState(false)
  const [versions, setVersions] = useState(null)
  const [versionsLoading, setVersionsLoading] = useState(false)
  const type = getVersionType(install.name)
  const info = VERSION_INFO[type]

  async function handleExpand() {
    const next = !expanded
    setExpanded(next)
    if (next && !versions && window.electronAPI?.getProtonVersionInfo) {
      setVersionsLoading(true)
      try {
        const v = await window.electronAPI.getProtonVersionInfo(install.path)
        setVersions(v)
      } catch {}
      setVersionsLoading(false)
    }
  }

  return (
    <div className={`${styles.item} ${expanded ? styles.itemExpanded : ''}`}>
      <div className={styles.itemMain} onClick={handleExpand}>
        <div className={styles.itemIcon} style={{ background: info.bg, borderColor: info.border, color: info.color }}>
          <i className={`ti ${type === 'ge' ? 'ti-flask' : 'ti-brand-steam'}`} />
        </div>
        <div className={styles.itemInfo}>
          <div className={styles.itemName}>{install.name}</div>
          <div className={styles.itemTags}>
            <span className={styles.itemTag} style={{ color: info.color, background: info.bg, borderColor: info.border }}>
              {info.label}
            </span>
            <span className={styles.itemRec}>{info.rec}</span>
          </div>
        </div>
        <button className={styles.infoBtn} aria-label="Info">
          <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
        </button>
      </div>
      {expanded && (
        <div className={styles.itemDesc}>
          <p>{info.desc}</p>

          {versionsLoading && (
            <div className={styles.versionsLoading}>
              <i className="ti ti-loader-2" style={{ animation: 'spin 0.7s linear infinite', fontSize: 11 }} />
              reading version files…
            </div>
          )}

          {versions && !versionsLoading && (
            <div className={styles.versions}>
              <div className={styles.versionRow}>
                <span className={styles.versionLabel}>DXVK</span>
                <span className={styles.versionValue}>{versions.dxvk || '—'}</span>
              </div>
              <div className={styles.versionRow}>
                <span className={styles.versionLabel}>VKD3D-Proton</span>
                <span className={styles.versionValue}>{versions.vkd3d || '—'}</span>
              </div>
              <div className={styles.versionRow}>
                <span className={styles.versionLabel}>Wine</span>
                <span className={styles.versionValue}>{versions.wine || '—'}</span>
              </div>
            </div>
          )}

          <div className={styles.itemPath}>{install.path}</div>
        </div>
      )}
    </div>
  )
}

export default function ProtonPanel({ installs, onRefresh, onOpenFolder }) {
  const [guideOpen, setGuideOpen] = useState(false)
  const [versionInfo, setVersionInfo] = useState({}) // path -> { dxvk, vkd3d, wine }
  const [runtimeInfo, setRuntimeInfo] = useState(null)
  const [runtimeLoading, setRuntimeLoading] = useState(false)
  const [runtimeExpanded, setRuntimeExpanded] = useState(false)

  useEffect(() => {
    if (!window.electronAPI?.getSteamRuntimeInfo) return
    setRuntimeLoading(true)
    window.electronAPI.getSteamRuntimeInfo()
      .then(info => setRuntimeInfo(info))
      .catch(() => {})
      .finally(() => setRuntimeLoading(false))
  }, [])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>proton</span>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={() => setGuideOpen(o => !o)} title="Which version should I use?">
            <i className="ti ti-help" />
          </button>
          <button className={styles.iconBtn} onClick={onRefresh} title="Refresh">
            <i className="ti ti-refresh" />
          </button>
          <button className={styles.iconBtn} onClick={onOpenFolder} title="Open installs folder">
            <i className="ti ti-folder-open" />
          </button>
        </div>
      </div>

      {guideOpen && (
        <div className={styles.guide}>
          <div className={styles.guideTitle}>which version to use?</div>
          <div className={styles.guideSteps}>
            <div className={styles.guideStep}>
              <span className={styles.guideNum}>1</span>
              <span>Start with the latest <strong>stable numbered version</strong> (e.g. Proton 9.0)</span>
            </div>
            <div className={styles.guideStep}>
              <span className={styles.guideNum}>2</span>
              <span>Game broken or has no video cutscenes? Try <strong>GE-Proton</strong></span>
            </div>
            <div className={styles.guideStep}>
              <span className={styles.guideNum}>3</span>
              <span>Very new game not working anywhere? Try <strong>Experimental</strong></span>
            </div>
          </div>
          <a
            href="https://www.protondb.com"
            className={styles.guideLink}
            onClick={e => { e.preventDefault(); window.electronAPI?.openExternal('https://www.protondb.com') }}
          >
            <i className="ti ti-external-link" style={{ fontSize: 11 }} />
            check protondb for game-specific reports
          </a>
        </div>
      )}

      <div className={styles.list}>
        {installs.length === 0 && (
          <div className={styles.empty}>no proton installs found</div>
        )}
        {installs.map((p, i) => (
          <ProtonItem key={i} install={p} />
        ))}
      </div>

      {runtimeInfo && (
        <div className={styles.runtimeSection}>
          <div
            className={styles.runtimeHeader}
            onClick={() => setRuntimeExpanded(e => !e)}
          >
            <div className={styles.runtimeHeaderLeft}>
              <div className={`${styles.runtimeDot} ${runtimeInfo.runtimes.length > 0 ? styles.runtimeDotGreen : styles.runtimeDotRed}`} />
              <span className={styles.runtimeTitle}>Steam Linux Runtime</span>
              <span className={styles.runtimeCount}>
                {runtimeInfo.runtimes.length} container{runtimeInfo.runtimes.length !== 1 ? 's' : ''}
              </span>
            </div>
            <i className={`ti ${runtimeExpanded ? 'ti-chevron-up' : 'ti-chevron-down'} ${styles.runtimeChevron}`} />
          </div>

          {runtimeExpanded && (
            <div className={styles.runtimeBody}>
              {runtimeInfo.runtimes.length === 0 && (
                <div className={styles.runtimeEmpty}>
                  no Steam Linux Runtime found — some games require it to run correctly
                </div>
              )}

              {runtimeInfo.runtimes.map((rt, i) => (
                <div key={i} className={styles.runtimeItem}>
                  <div className={styles.runtimeItemLeft}>
                    <i className={`ti ${rt.hasPressureVessel ? 'ti-box' : 'ti-box-off'}`}
                      style={{ color: rt.hasPressureVessel ? 'var(--green)' : 'var(--text-hint)', fontSize: 13 }} />
                    <div className={styles.runtimeItemInfo}>
                      <div className={styles.runtimeItemName}>{rt.name}</div>
                      {rt.version && (
                        <div className={styles.runtimeItemVer}>{rt.version}</div>
                      )}
                    </div>
                  </div>
                  <div className={styles.runtimeItemTags}>
                    {rt.hasPressureVessel && (
                      <span className={styles.runtimeTag} style={{ color: 'var(--green)', borderColor: 'var(--green-dim)', background: '#061209' }}>
                        pressure-vessel
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <div className={styles.runtimeInfo}>
                <i className="ti ti-info-circle" style={{ fontSize: 11, flexShrink: 0 }} />
                <span>
                  Steam Linux Runtime provides a container environment for Proton games.
                  pressure-vessel is required by some games — if a game crashes immediately, missing runtime is a common cause.
                </span>
              </div>

              {!runtimeInfo.pressureVesselAvailable && (
                <div className={styles.runtimeWarn}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: 12, flexShrink: 0 }} />
                  <span>
                    pressure-vessel not found. Install Steam Linux Runtime via Steam:
                    <br />
                    <code>steam steam://install/1391110</code>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className={styles.footer}>
        <a
          href="https://github.com/GloriousEggroll/proton-ge-custom/releases"
          className={styles.footerLink}
          onClick={e => { e.preventDefault(); window.electronAPI?.openExternal('https://github.com/GloriousEggroll/proton-ge-custom/releases') }}
        >
          <i className="ti ti-external-link" style={{ fontSize: 11 }} />
          get GE-Proton
        </a>
        <button className={styles.footerLink} onClick={onOpenFolder}>
          <i className="ti ti-folder" style={{ fontSize: 11 }} />
          open installs folder
        </button>
      </div>
    </div>
  )
}