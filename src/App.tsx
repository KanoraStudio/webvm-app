import { useState } from 'react'
import { VMConfig }      from './types/VMConfig'
import { HomeScreen }    from './screens/HomeScreen'
import { CreateWizard }  from './screens/CreateWizard'
import { RunScreen }     from './screens/RunScreen'

type AppView = 'home' | 'create' | 'run'

interface RunTarget { vm: VMConfig; isoFile?: File }

export default function App() {
  const [view,   setView]   = useState<AppView>('home')
  const [target, setTarget] = useState<RunTarget | null>(null)

  const goHome   = () => { setView('home'); setTarget(null) }
  const goCreate = () => setView('create')

  const handleCreated = (vm: VMConfig) => {
    setView('home')
  }

  const handleStart = (vm: VMConfig, isoFile?: File) => {
    setTarget({ vm, isoFile })
    setView('run')
  }

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* ── ヘッダー（homeとcreate時のみ） ─────────────────────── */}
      {view !== 'run' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
          background: 'linear-gradient(180deg,#2d2d44,#252538)',
          borderBottom: '1px solid #3d3d5c', minHeight: 44,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {/* ロゴ */}
          <span style={{ fontSize: 20 }}>🖥️</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#38bdf8' }}>WebVM</span>
          <span style={{ fontSize: 11, color: '#334155' }}>仮想マシン マネージャー</span>

          {/* ブレッドクラム */}
          <span style={{ fontSize: 11, color: '#334155', margin: '0 4px' }}>›</span>
          {view === 'create'
            ? <span style={{ fontSize: 12, color: '#7dd3fc' }}>新規仮想マシン</span>
            : <span style={{ fontSize: 12, color: '#64748b' }}>ホーム</span>
          }

          {/* 右側ナビ */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 20, padding: '2px 12px', fontSize: 11, color: '#7dd3fc', whiteSpace: 'nowrap' }}>
              🔵 カメラ・マイク・USBはChrome/Edgeのみ対応
            </div>
            {view === 'create' && (
              <button onClick={goHome} style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                ← ホームへ
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── メインコンテンツ ─────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {view === 'home' && (
          <HomeScreen onStart={handleStart} onCreate={goCreate} />
        )}
        {view === 'create' && (
          <CreateWizard onCreated={handleCreated} onCancel={goHome} />
        )}
        {view === 'run' && target && (
          <RunScreen vm={target.vm} isoFile={target.isoFile} onStop={goHome} />
        )}
      </div>
    </div>
  )
}
