import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// エラーバウンダリ
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: '#0f172a', color: '#f1f5f9', padding: 32, gap: 16,
          fontFamily: 'monospace',
        }}>
          <div style={{ fontSize: 48 }}>💥</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f87171' }}>エラーが発生しました</div>
          <div style={{
            background: '#1e0000', border: '1px solid #7f1d1d', borderRadius: 8,
            padding: '14px 20px', maxWidth: 600, width: '100%',
            fontSize: 13, color: '#fca5a5', wordBreak: 'break-all', lineHeight: 1.7,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{e.name}: {e.message}</div>
            <div style={{ color: '#7f1d1d', fontSize: 11 }}>{e.stack}</div>
          </div>
          <div style={{ fontSize: 13, color: '#64748b', maxWidth: 500, textAlign: 'center', lineHeight: 1.7 }}>
            F12 → Console タブで詳細を確認してください。<br />
            よくある原因: <code style={{ color: '#38bdf8' }}>npm run setup</code> が未実行 / v86ファイルが未ダウンロード
          </div>
          <button onClick={() => window.location.reload()}
            style={{ background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            🔄 再読み込み
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const root = document.getElementById('root')!

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

// スプラッシュを消す
;(window as any).__onAppMounted?.()
