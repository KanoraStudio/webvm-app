import { useState, useRef, useEffect, useCallback } from 'react'
import { VMConfig, OS_PRESETS } from '../types/VMConfig'
import { EmulatorManager }     from '../core/EmulatorManager'
import { DeviceBar }            from '../ui/DeviceBar'
import { vmStore }              from '../core/VMStore'

// ── 転送速度計測ラッパー ─────────────────────────────────────────────
function measureFile(file: File, onBytes: (n: number) => void): File {
  return new Proxy(file, {
    get(t, p) {
      if (p === 'slice') return (...a: [number?, number?, string?]) => {
        const blob = t.slice(...a)
        onBytes(Math.max(0, (a[1] ?? file.size) - (a[0] ?? 0)))
        return blob
      }
      const v = (t as any)[p]
      return typeof v === 'function' ? v.bind(t) : v
    }
  })
}

// ── スピードグラフ ───────────────────────────────────────────────────
const GW = 380, GH = 64, HIST = 40

function SpeedGraph({ data }: { data: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, GW, GH)
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, GW, GH)
    // グリッド
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, GH/4*i); ctx.lineTo(GW, GH/4*i); ctx.stroke() }
    if (data.length < 2) return
    const max = Math.max(...data, 0.1)
    const step = GW / (HIST - 1)
    const pts = data.map((v, i): [number, number] => [i * step, GH - 4 - (v / max) * (GH - 8)])
    const g = ctx.createLinearGradient(0, 0, 0, GH)
    g.addColorStop(0, 'rgba(56,189,248,0.5)'); g.addColorStop(1, 'rgba(56,189,248,0.03)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, GH)
    pts.forEach(([x, y]) => ctx.lineTo(x, y))
    ctx.lineTo(pts[pts.length-1][0], GH); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5; ctx.beginPath()
    pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke()
  }, [data])
  return <canvas ref={ref} width={GW} height={GH} style={{ display:'block', width:'100%', height:GH }} />
}

// ── メイン ───────────────────────────────────────────────────────────
interface Props {
  vm:      VMConfig
  isoFile?: File
  onStop:  () => void
}

export const RunScreen = ({ vm, isoFile, onStop }: Props) => {
  type Phase = 'preflight' | 'booting' | 'running' | 'error'

  const [phase,    setPhase]    = useState<Phase>('preflight')
  const [pct,      setPct]      = useState(0)
  const [sec,      setSec]      = useState(0)
  const [errMsg,   setErrMsg]   = useState('')
  const [detail,   setDetail]   = useState(true)  // デフォルトで開く
  const [logs,     setLogs]     = useState<{ t:string; msg:string; kind:'ok'|'err'|'info'|'serial' }[]>([])
  const [mbps,     setMbps]     = useState(0)
  const [totalMB,  setTotalMB]  = useState(0)
  const [graph,    setGraph]    = useState<number[]>(Array(HIST).fill(0))
  const [fullscr,  setFullscr]  = useState(false)
  const [addPanel, setAddPanel] = useState(false)
  const [clipTxt,  setClipTxt]  = useState('')
  const [saveOk,   setSaveOk]   = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const mgrRef       = useRef<EmulatorManager | null>(null)
  const timerRef     = useRef<number|null>(null)
  const secRef       = useRef<number|null>(null)
  const speedRef     = useRef<number|null>(null)
  const bytesRef     = useRef(0)
  const totalRef     = useRef(0)
  const histRef      = useRef<number[]>(Array(HIST).fill(0))
  const startRef     = useRef(Date.now())
  const pctRef       = useRef(0)

  const log = useCallback((msg: string, kind: 'ok'|'err'|'info'|'serial' = 'info') => {
    const t = new Date().toLocaleTimeString('ja-JP', {hour12:false})
    setLogs(p => [{t, msg, kind}, ...p].slice(0, 120))
  }, [])

  // ResizeObserver で解像度自動同期
  useEffect(() => {
    if (phase !== 'running' || !containerRef.current) return
    const obs = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect
      if (r && r.width > 0 && r.height > 0)
        mgrRef.current?.syncResolution(Math.floor(r.width), Math.floor(r.height))
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [phase])

  // フルスクリーン検出
  useEffect(() => {
    const h = () => setFullscr(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  // メイン起動処理
  useEffect(() => {
    if (!containerRef.current) return
    const mgr = new EmulatorManager()
    mgrRef.current = mgr
    startRef.current = Date.now()

    // 速度タイマー（1秒ごと）
    speedRef.current = window.setInterval(() => {
      const mb = bytesRef.current / 1024 / 1024
      setMbps(mb); setTotalMB(totalRef.current / 1024 / 1024)
      histRef.current = [...histRef.current.slice(1), mb]
      setGraph([...histRef.current])
      bytesRef.current = 0
    }, 1000)

    // 経過タイマー
    secRef.current = window.setInterval(() => {
      setSec(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)

    // 疑似プログレス（0→70%まで動かす。残りはイベント待ち）
    timerRef.current = window.setInterval(() => {
      pctRef.current = pctRef.current < 65
        ? pctRef.current + Math.random() * 6
        : pctRef.current + 0.1
      setPct(Math.min(pctRef.current, 70))
    }, 600)

    const measured = isoFile
      ? measureFile(isoFile, n => { bytesRef.current += n; totalRef.current += n })
      : undefined

    // 非同期起動（エラーをキャッチ）
    ;(async () => {
      try {
        await mgr.start(
          {
            vm,
            isoFile: measured,
            onStateChange: msg => {
              log(msg, msg.includes('✅')||msg.includes('🎉') ? 'ok' : msg.includes('❌')||msg.includes('失敗') ? 'err' : 'info')
              // ファイル確認完了でpreflight→booting
              if (msg.includes('emulator-ready') === false && msg.includes('✅ 必須ファイル')) {
                setPhase('booting')
                setPct(20)
                pctRef.current = 20
              }
            },
            onSerial: line => log(line, 'serial'),
            onReady: () => {
              // emulator-ready = BIOSが起動した。すぐに画面を表示
              clearInterval(timerRef.current!)
              log('🎉 BIOS起動完了！画面を表示します', 'ok')
              setPct(100)
              setPhase('running')  // ← ここでVM画面に切り替え（OSはまだ起動中でOK）
            },
          },
          containerRef.current!
        )
      } catch (e: any) {
        clearInterval(timerRef.current!)
        log(`❌ ${e.message}`, 'err')
        setErrMsg(e.message)
        setPhase('error')
      }
    })()

    return () => {
      clearInterval(timerRef.current!)
      clearInterval(secRef.current!)
      clearInterval(speedRef.current!)
      mgr.destroy()
    }
  }, [])

  const handleStop = async () => {
    clearInterval(timerRef.current!)
    clearInterval(secRef.current!)
    clearInterval(speedRef.current!)
    if (phase === 'running') {
      await mgrRef.current?.saveState(vm.hddKey)
      await vmStore.saveVM({ ...vm, lastUsed: Date.now() })
    }
    mgrRef.current?.destroy()
    onStop()
  }

  const handleSave = async () => {
    await mgrRef.current?.saveState(vm.hddKey)
    setSaveOk(true); setTimeout(() => setSaveOk(false), 2500)
    log('💾 状態を保存しました', 'ok')
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }

  const handleClipSend = () => {
    if (clipTxt) { mgrRef.current?.copyToGuest(clipTxt); setClipTxt('') }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const txt = e.dataTransfer.getData('text')
    if (txt) { mgrRef.current?.copyToGuest(txt); log(`DnD送信: "${txt.slice(0,40)}"`) }
  }

  const preset   = OS_PRESETS[vm.osType]
  const isLoading = phase === 'preflight' || phase === 'booting'

  const estimateRemain = (): string => {
    if (pct <= 5 || sec === 0) return '計算中...'
    if (pct >= 70) return 'BIOS起動待ち...'
    const rem = (70 - pct) / (pct / sec)
    if (rem > 60) return `約${Math.ceil(rem/60)}分`
    return `約${Math.ceil(rem)}秒`
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0f172a' }}
         onDrop={handleDrop} onDragOver={e => e.preventDefault()}>

      {/* ── ツールバー ──────────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', gap:6, padding:'4px 12px',
        background:'linear-gradient(180deg,#2d2d44,#252538)',
        borderBottom:'1px solid #3d3d5c', flexWrap:'wrap', minHeight:42,
      }}>
        <div style={{ display:'flex', gap:5, marginRight:8 }}>
          <Dot color="#ff5f57" onClick={handleStop} title="停止" />
          <Dot color="#febc2e" onClick={()=>{}} title="" />
          <Dot color="#28c840" onClick={handleFullscreen} title="フルスクリーン" />
        </div>
        <span style={{ fontSize:13, fontWeight:700, color:'#7dd3fc' }}>{preset.icon} {vm.name}</span>
        {isoFile && <span style={{ fontSize:11, color:'#3d4a5c' }}>· {isoFile.name}</span>}
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <TBtn onClick={handleFullscreen} label={fullscr ? '⬛ ウィンドウ' : '⛶ フルスクリーン'} />
          <TBtn onClick={() => setAddPanel(v=>!v)} label="🛠️ WebVM Software" active={addPanel} />
          <TBtn onClick={handleSave} label={saveOk ? '✅ 保存完了' : '💾 保存'} />
          <TBtn onClick={handleStop} label="■ 電源OFF" danger />
        </div>
      </div>

      {/* WebVM Software パネル */}
      {addPanel && (
        <div style={{ background:'#1e293b', borderBottom:'1px solid #334155', padding:'10px 16px', display:'flex', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>📋 クリップボード（ホスト→ゲスト）</div>
            <div style={{ display:'flex', gap:6 }}>
              <input value={clipTxt} onChange={e=>setClipTxt(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleClipSend()}
                placeholder="テキストを入力 → Enterで送信"
                style={{ width:240, background:'#0f172a', color:'#f1f5f9', border:'1px solid #334155', borderRadius:6, padding:'4px 8px', fontSize:12, outline:'none' }}/>
              <button onClick={handleClipSend}
                style={{ background:'#1e3a5f', color:'#38bdf8', border:'1px solid #2563eb', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12 }}>送信</button>
              <button onClick={async()=>{ const t=await navigator.clipboard.readText(); setClipTxt(t) }}
                style={{ background:'#1e293b', color:'#94a3b8', border:'1px solid #334155', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12 }}>📋 ペースト</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>🖥️ 解像度</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {['800x600','1024x768','1280x720','1920x1080'].map(r=>(
                <button key={r} onClick={()=>{ const [w,h]=r.split('x').map(Number); mgrRef.current?.syncResolution(w,h) }}
                  style={{ background:'#0f172a', color:'#94a3b8', border:'1px solid #334155', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11 }}>{r}</button>
              ))}
              <button onClick={()=>mgrRef.current?.syncResolution(window.innerWidth, window.innerHeight-150)}
                style={{ background:'#1e3a5f', color:'#38bdf8', border:'1px solid #2563eb', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11 }}>🔄 自動</button>
            </div>
          </div>
        </div>
      )}

      {/* DeviceBar（起動後のみ）*/}
      {phase === 'running' && (
        <DeviceBar emulator={mgrRef.current?.getEmulator()} canvas={canvasRef.current} />
      )}

      {/* ── メインエリア ─────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }}>

        {/* ── VM画面（常に存在。起動中でも表示） ─────────────────── */}
        <div
          ref={containerRef}
          onDrop={handleDrop} onDragOver={e=>e.preventDefault()}
          style={{
            flex: 1,
            display: 'flex', alignItems:'center', justifyContent:'center',
            background:'#000',
            // booting中は半透明で表示（BIOSが見える！）
            opacity: phase === 'running' ? 1 : phase === 'booting' ? 0.85 : 0,
            transition: 'opacity 0.5s',
          }}
        >
          <canvas ref={canvasRef} style={{ display:'block', imageRendering:'pixelated', maxWidth:'100%', maxHeight:'100%' }} />
        </div>

        {/* ── ローディングオーバーレイ（半透明） ────────────────── */}
        {isLoading && (
          <div style={{
            position:'absolute', inset:0,
            background: phase === 'booting' ? 'rgba(0,0,0,0.35)' : 'rgba(15,23,42,0.98)',
            display:'flex', alignItems:'center', justifyContent:'center',
            backdropFilter: phase === 'booting' ? 'none' : 'none',
            transition: 'background 0.5s',
          }}>
            <div style={{ width:'100%', maxWidth:520, padding:'0 20px' }}>

              {/* VMウィンドウ枠 */}
              <div style={{ background:'rgba(30,30,46,0.95)', border:'1px solid #3d3d5c', borderRadius:10, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.8)' }}>
                <div style={{ background:'linear-gradient(180deg,#2d2d44,#252538)', padding:'6px 14px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid #3d3d5c' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 6px #22c55e' }} />
                  <span style={{ fontSize:12, color:'#94a3b8', fontFamily:'monospace' }}>
                    {phase === 'preflight' ? '📋 ファイル確認中' : '⚙️ BIOS起動中'} — {vm.name}
                  </span>
                  {phase === 'booting' && (
                    <span style={{ marginLeft:'auto', fontSize:11, color:'#38bdf8', fontFamily:'monospace' }}>
                      ↓ 背後でBIOSが起動しています
                    </span>
                  )}
                </div>

                <div style={{ padding:'18px 20px' }}>
                  {/* ヘッダー */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                    <div style={{ width:44, height:44, borderRadius:10, background:'linear-gradient(135deg,#1e3a5f,#0f172a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, border:'1px solid #334155', flexShrink:0 }}>
                      {preset.icon}
                    </div>
                    <div>
                      <div style={{ fontSize:15, fontWeight:700, color:'#f1f5f9' }}>
                        {phase === 'preflight' ? '起動準備中...' : 'BIOS起動中...'}
                      </div>
                      <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>
                        {phase === 'booting'
                          ? '▼ 下の画面にBIOSが表示されています'
                          : `RAM ${vm.memoryMB}MB · HDD ${(vm.storageMB/1024).toFixed(0)}GB`
                        }
                      </div>
                    </div>
                  </div>

                  {/* プログレスバー */}
                  <div style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:'#94a3b8' }}>
                        <span style={{ color:'#38bdf8', fontWeight:700 }}>{Math.round(pct)}%</span>
                        {'  '}{phase === 'preflight' ? 'ファイル確認' : 'BIOS POST'}
                      </span>
                      <span style={{ fontSize:11, color:'#475569' }}>⏱ {sec}秒 {estimateRemain()}</span>
                    </div>
                    <div style={{ background:'#0f172a', borderRadius:99, height:7, overflow:'hidden', border:'1px solid #1e293b' }}>
                      <div style={{ height:'100%', borderRadius:99, background:'linear-gradient(90deg,#38bdf8,#6366f1)', width:`${pct}%`, transition:'width 0.5s ease', boxShadow:'0 0 8px rgba(56,189,248,0.5)' }} />
                    </div>
                  </div>

                  {/* phase === booting の説明 */}
                  {phase === 'booting' && (
                    <div style={{ background:'rgba(56,189,248,0.05)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:6, padding:'8px 12px', marginBottom:12, fontSize:12, color:'#7dd3fc' }}>
                      💡 このパネルの後ろでBIOSが動いています。<br />
                      完了すると自動でVM画面に切り替わります。
                    </div>
                  )}

                  {/* 詳細情報（デフォルト開）*/}
                  <div style={{ border:'1px solid #1e293b', borderRadius:8, overflow:'hidden' }}>
                    <button onClick={()=>setDetail(v=>!v)} style={{
                      width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                      background:'#0f172a', border:'none', padding:'7px 12px', color:'#64748b', fontSize:12, cursor:'pointer',
                    }}>
                      <span>📊 詳細情報（ログ・転送速度）</span>
                      <span style={{ transition:'transform 0.2s', transform:detail?'rotate(180deg)':'none', fontSize:10 }}>▼</span>
                    </button>

                    {detail && (
                      <div style={{ background:'#020617', borderTop:'1px solid #1e293b' }}>

                        {/* 転送速度グラフ */}
                        {isoFile && (
                          <div style={{ padding:'8px 12px', borderBottom:'1px solid #0a0a1e' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                              <span style={{ fontSize:11, color:'#334155', fontFamily:'monospace' }}>ISO読み取り速度</span>
                              <div style={{ display:'flex', gap:12 }}>
                                <span style={{ fontSize:14, fontWeight:700, color:'#38bdf8', fontFamily:'monospace' }}>
                                  {mbps >= 1 ? `${mbps.toFixed(1)} MB/s` : `${(mbps*1024).toFixed(0)} KB/s`}
                                </span>
                                <span style={{ fontSize:11, color:'#334155', fontFamily:'monospace' }}>
                                  合計 {totalMB.toFixed(1)} MB
                                </span>
                              </div>
                            </div>
                            <SpeedGraph data={graph} />
                          </div>
                        )}

                        {/* 統計 */}
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, borderBottom:'1px solid #020617' }}>
                          {[
                            { l:'経過', v:`${sec}秒` },
                            { l:'CPU', v:'x86_64' },
                            { l:'RAM', v:`${vm.memoryMB}MB` },
                            { l:'NET', v:vm.network?'ON':'OFF' },
                          ].map(s=>(
                            <div key={s.l} style={{ background:'#030712', padding:'5px 8px', textAlign:'center' }}>
                              <div style={{ fontSize:9, color:'#1e293b', fontFamily:'monospace' }}>{s.l}</div>
                              <div style={{ fontSize:12, color:'#475569', fontFamily:'monospace', fontWeight:600 }}>{s.v}</div>
                            </div>
                          ))}
                        </div>

                        {/* ログ */}
                        <div style={{ maxHeight:160, overflowY:'auto', padding:'6px 10px' }}>
                          {logs.length === 0
                            ? <div style={{ fontSize:11, color:'#1e293b', fontFamily:'monospace' }}>待機中...</div>
                            : logs.map((l,i)=>(
                              <div key={i} style={{
                                fontSize:11, fontFamily:'monospace', marginBottom:1,
                                color: l.kind==='ok'?'#4ade80': l.kind==='err'?'#f87171': l.kind==='serial'?'#fcd34d':'#334155',
                              }}>
                                <span style={{ color:'#1e293b' }}>[{l.t}]</span> {l.msg}
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── エラー画面 ────────────────────────────────────────── */}
        {phase === 'error' && (
          <div style={{ position:'absolute', inset:0, background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ maxWidth:500, padding:'0 20px', textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>❌</div>
              <div style={{ fontSize:18, fontWeight:700, color:'#f87171', marginBottom:12 }}>起動エラー</div>
              <div style={{ background:'#1f0000', border:'1px solid #7f1d1d', borderRadius:10, padding:'14px 18px', fontSize:13, color:'#fca5a5', fontFamily:'monospace', textAlign:'left', lineHeight:1.7, marginBottom:20, wordBreak:'break-all' }}>
                {errMsg}
              </div>

              {/* よくある解決策 */}
              <div style={{ background:'#0c1a0c', border:'1px solid #166534', borderRadius:10, padding:'14px 18px', fontSize:13, color:'#86efac', textAlign:'left', marginBottom:16, lineHeight:1.7 }}>
                <div style={{ fontWeight:700, marginBottom:8 }}>💡 解決策</div>
                <div>• <code>npm run setup</code> を再実行してv86ファイルをDL</div>
                <div>• ページをリロードして再試行（Ctrl+Shift+R）</div>
                <div>• F12 → Console タブで詳細エラーを確認</div>
                <div>• Chrome / Edge の最新版を使用</div>
              </div>

              <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                <button onClick={()=>window.location.reload()}
                  style={{ background:'#38bdf8', color:'#0f172a', border:'none', borderRadius:8, padding:'10px 24px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  🔄 リロード
                </button>
                <button onClick={onStop}
                  style={{ background:'#1e293b', color:'#94a3b8', border:'1px solid #334155', borderRadius:8, padding:'10px 24px', fontSize:14, cursor:'pointer' }}>
                  ← ホームへ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ステータスバー */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'2px 14px', background:'#020617', borderTop:'1px solid #0f172a', fontSize:11, color:'#1e293b', fontFamily:'monospace', flexWrap:'wrap' }}>
        <span style={{ color: phase==='running'?'#22c55e': phase==='error'?'#f87171':'#f59e0b' }}>
          {phase==='running'?'● 実行中': phase==='error'?'● エラー': phase==='booting'?`● BIOS起動中 ${Math.round(pct)}%`:`● 準備中 ${Math.round(pct)}%`}
        </span>
        <span>{vm.name}</span>
        {isoFile && <span>📡 {mbps>=1?`${mbps.toFixed(1)}MB/s`:`${(mbps*1024).toFixed(0)}KB/s`}</span>}
        {vm.network && <span style={{ color:'#22c55e' }}>🌐 ETH</span>}
        <span style={{ marginLeft:'auto' }}>WebVM v2.0</span>
      </div>
    </div>
  )
}

function Dot({ color, onClick, title }: { color:string; onClick:()=>void; title:string }) {
  return <div onClick={onClick} title={title} style={{ width:12, height:12, borderRadius:'50%', background:color, cursor:'pointer', boxShadow:`0 0 4px ${color}60` }} />
}
function TBtn({ onClick, label, active, danger }: { onClick:()=>void; label:string; active?:boolean; danger?:boolean }) {
  return (
    <button onClick={onClick} style={{
      background: danger?'#3d1f1f': active?'#1e3a5f':'#1e293b',
      color: danger?'#f87171': active?'#38bdf8':'#94a3b8',
      border: `1px solid ${danger?'#7f1d1d': active?'#2563eb':'#334155'}`,
      borderRadius:5, padding:'3px 9px', cursor:'pointer', fontSize:11, whiteSpace:'nowrap',
    }}>{label}</button>
  )
}
