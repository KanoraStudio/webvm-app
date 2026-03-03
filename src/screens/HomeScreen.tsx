import { useState, useEffect, useRef } from 'react'
import { VMConfig, OS_PRESETS } from '../types/VMConfig'
import { vmStore } from '../core/VMStore'

interface Props {
  onStart:  (vm: VMConfig, isoFile?: File) => void
  onCreate: () => void
}

function fmt(ms: number) {
  if (!ms) return '未使用'
  const d = new Date(ms)
  return d.toLocaleDateString('ja-JP') + ' ' + d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

export const HomeScreen = ({ onStart, onCreate }: Props) => {
  const [vms,      setVms]      = useState<VMConfig[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [editVm,   setEditVm]   = useState<VMConfig | null>(null)
  const [confirm,  setConfirm]  = useState<string | null>(null) // delete confirm
  const [isoMap,   setIsoMap]   = useState<Record<string, File>>({})
  const fileRef    = useRef<HTMLInputElement>(null)
  const importRef  = useRef<HTMLInputElement>(null)

  useEffect(() => { vmStore.loadVMs().then(setVms) }, [])

  const sel = vms.find(v => v.id === selected)

  const handleDelete = async (id: string) => {
    await vmStore.deleteVM(id)
    setVms(vms.filter(v => v.id !== id))
    if (selected === id) setSelected(null)
    setConfirm(null)
  }

  const handleExport = async (vm: VMConfig) => {
    const blob = await vmStore.exportVM(vm.id)
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${vm.name}.wvm`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const vm = await vmStore.importVM(file)
    setVms(prev => [...prev, vm])
    setSelected(vm.id)
    e.target.value = ''
  }

  const handleISOSelect = (vmId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setIsoMap(prev => ({ ...prev, [vmId]: file }))
    e.target.value = ''
  }

  const handleSaveEdit = async () => {
    if (!editVm) return
    await vmStore.saveVM(editVm)
    setVms(vms.map(v => v.id === editVm.id ? editVm : v))
    setEditVm(null)
  }

  const P = OS_PRESETS

  return (
    <div style={{ display: 'flex', height: '100%', background: '#1a1a2e', color: '#e2e8f0', fontFamily: 'Segoe UI, Arial, sans-serif' }}>

      {/* ── 左：VMリスト ─────────────────────────────────────────── */}
      <div style={{ width: 280, borderRight: '1px solid #2d2d44', display: 'flex', flexDirection: 'column', background: '#16213e' }}>

        {/* ロゴ */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #2d2d44', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🖥️</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#38bdf8' }}>WebVM</div>
            <div style={{ fontSize: 10, color: '#475569' }}>仮想マシン マネージャー</div>
          </div>
        </div>

        {/* ツールバー */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderBottom: '1px solid #2d2d44' }}>
          <Btn icon="➕" label="新規作成" onClick={onCreate} color="#38bdf8" />
          <Btn icon="📂" label="インポート" onClick={() => importRef.current?.click()} color="#94a3b8" />
          <input ref={importRef} type="file" accept=".wvm" style={{ display: 'none' }} onChange={handleImport} />
        </div>

        {/* VMリスト */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {vms.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#334155', fontSize: 13 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🖥️</div>
              仮想マシンがありません<br />「新規作成」で始めましょう
            </div>
          )}
          {vms.map(vm => {
            const preset = P[vm.osType]
            const isActive = selected === vm.id
            return (
              <div
                key={vm.id}
                onClick={() => setSelected(vm.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  background: isActive ? '#1e3a5f' : 'transparent',
                  borderLeft: `3px solid ${isActive ? '#38bdf8' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                  borderBottom: '1px solid #1e293b',
                }}
              >
                <span style={{ fontSize: 22 }}>{preset.icon}</span>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#f1f5f9' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {vm.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    {preset.label} · {vm.memoryMB}MB RAM
                  </div>
                </div>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: isoMap[vm.id] ? '#22c55e' : '#334155',
                  boxShadow: isoMap[vm.id] ? '0 0 6px #22c55e' : 'none',
                }} title={isoMap[vm.id] ? 'ISO選択済み' : 'ISO未選択'} />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 右：詳細＋操作 ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!sel ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155' }}>
            <div style={{ fontSize: 64 }}>🖥️</div>
            <div style={{ fontSize: 16, marginTop: 16 }}>仮想マシンを選択してください</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>または「新規作成」でVMを追加</div>
            <button onClick={onCreate} style={{ marginTop: 24, background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              ➕ 新規仮想マシン作成
            </button>
          </div>
        ) : editVm ? (
          // ── 設定編集パネル ──
          <EditPanel vm={editVm} onChange={setEditVm} onSave={handleSaveEdit} onCancel={() => setEditVm(null)} />
        ) : (
          // ── VM詳細パネル ──
          <div style={{ padding: 28, maxWidth: 700 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 14,
                background: 'linear-gradient(135deg,#1e3a5f,#0f172a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, border: '1px solid #334155',
                boxShadow: '0 0 24px rgba(56,189,248,0.2)',
              }}>
                {P[sel.osType].icon}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{sel.name}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  {P[sel.osType].label} · {sel.osVersion}
                </div>
              </div>
            </div>

            {/* スペック表 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
              {[
                { label: 'メモリ',         value: `${sel.memoryMB} MB` },
                { label: 'ストレージ',     value: `${(sel.storageMB/1024).toFixed(0)} GB` },
                { label: 'ネットワーク',   value: sel.network ? '✅ イーサネット (RTL8139)' : '❌ 無効' },
                { label: 'OS種類',         value: `${P[sel.osType].label}` },
                { label: 'OS',             value: sel.osVersion },
                { label: '最終使用',       value: fmt(sel.lastUsed ?? 0) },
                { label: '作成日',         value: fmt(sel.createdAt) },
                { label: 'ISO',            value: isoMap[sel.id]?.name ?? '未選択' },
              ].map(r => (
                <div key={r.label} style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', border: '1px solid #2d2d44' }}>
                  <div style={{ fontSize: 11, color: '#475569', marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', fontFamily: 'monospace' }}>{r.value}</div>
                </div>
              ))}
            </div>

            {/* ISO 選択 */}
            <div style={{ background: '#1e293b', border: `1px solid ${isoMap[sel.id] ? '#22c55e' : '#334155'}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 3 }}>
                    💿 起動ISO
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {isoMap[sel.id]
                      ? `${isoMap[sel.id].name}（${(isoMap[sel.id].size/1024/1024).toFixed(0)}MB）`
                      : 'ISOファイルを選択してください'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {isoMap[sel.id] && (
                    <button
                      onClick={() => setIsoMap(prev => { const n = {...prev}; delete n[sel.id]; return n })}
                      style={{ background: 'transparent', color: '#ef4444', border: '1px solid #7f1d1d', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                    >✕ 解除</button>
                  )}
                  <input ref={fileRef} type="file" accept=".iso" style={{ display: 'none' }} onChange={handleISOSelect(sel.id)} />
                  <button onClick={() => fileRef.current?.click()}
                    style={{ background: '#1e3a5f', color: '#38bdf8', border: '1px solid #2563eb', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    📂 選択
                  </button>
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => { onStart(sel, isoMap[sel.id]) }}
                style={{ background: '#22c55e', color: '#052e16', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 16px rgba(34,197,94,0.3)' }}>
                ▶ 起動
              </button>
              <button onClick={() => setEditVm({ ...sel })}
                style={{ background: '#1e3a5f', color: '#38bdf8', border: '1px solid #2563eb', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ⚙️ 設定
              </button>
              <button onClick={() => handleExport(sel)}
                style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '10px 20px', fontSize: 13, cursor: 'pointer' }}>
                📤 エクスポート
              </button>
              <button onClick={() => setConfirm(sel.id)}
                style={{ background: '#1e1e1e', color: '#f87171', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 20px', fontSize: 13, cursor: 'pointer' }}>
                🗑️ 削除
              </button>
            </div>

            {/* 削除確認 */}
            {confirm === sel.id && (
              <div style={{ marginTop: 16, background: '#1f0000', border: '1px solid #7f1d1d', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 14, color: '#f87171', marginBottom: 10, fontWeight: 600 }}>
                  ⚠️ 「{sel.name}」を削除しますか？（HDDデータも消えます）
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleDelete(sel.id)}
                    style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, padding: '6px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    削除する
                  </button>
                  <button onClick={() => setConfirm(null)}
                    style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, padding: '6px 18px', cursor: 'pointer', fontSize: 13 }}>
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 小コンポーネント ──────────────────────────────────────────────────
function Btn({ icon, label, onClick, color }: { icon: string; label: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 4, background: '#1e293b', color,
      border: `1px solid #2d2d44`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
    }}>{icon} {label}</button>
  )
}

function EditPanel({ vm, onChange, onSave, onCancel }: { vm: VMConfig; onChange: (v: VMConfig) => void; onSave: () => void; onCancel: () => void }) {
  const p = OS_PRESETS
  return (
    <div style={{ padding: 28, maxWidth: 520 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 24 }}>⚙️ 設定: {vm.name}</div>

      {[
        { label: '名前', type: 'text', value: vm.name, onChange: (v: string) => onChange({ ...vm, name: v }) },
      ].map(f => (
        <Field key={f.label} label={f.label}>
          <input
            type="text" value={f.value as string}
            onChange={e => f.onChange(e.target.value)}
            style={{ width: '100%', background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}
          />
        </Field>
      ))}

      <Field label="OS種類">
        <select value={vm.osType} onChange={e => onChange({ ...vm, osType: e.target.value as any, osVersion: p[e.target.value as keyof typeof p].versions[0] })}
          style={{ width: '100%', background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}>
          {(Object.keys(p) as (keyof typeof p)[]).map(k => (
            <option key={k} value={k}>{p[k].icon} {p[k].label}</option>
          ))}
        </select>
      </Field>

      <Field label="OSバージョン">
        <select value={vm.osVersion} onChange={e => onChange({ ...vm, osVersion: e.target.value })}
          style={{ width: '100%', background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}>
          {p[vm.osType].versions.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </Field>

      <Field label={`メモリ: ${vm.memoryMB} MB`}>
        <input type="range" min={64} max={4096} step={64} value={vm.memoryMB}
          onChange={e => onChange({ ...vm, memoryMB: Number(e.target.value) })}
          style={{ width: '100%', accentColor: '#38bdf8' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginTop: 2 }}>
          <span>64MB</span><span>4096MB</span>
        </div>
      </Field>

      <Field label={`ストレージ: ${(vm.storageMB/1024).toFixed(0)} GB`}>
        <input type="range" min={512} max={65536} step={512} value={vm.storageMB}
          onChange={e => onChange({ ...vm, storageMB: Number(e.target.value) })}
          style={{ width: '100%', accentColor: '#38bdf8' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginTop: 2 }}>
          <span>0.5GB</span><span>64GB</span>
        </div>
      </Field>

      <Field label="ネットワーク">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={vm.network} onChange={e => onChange({ ...vm, network: e.target.checked })}
            style={{ accentColor: '#38bdf8', width: 16, height: 16 }} />
          <span style={{ fontSize: 13, color: '#94a3b8' }}>イーサネット (RTL8139) を有効にする</span>
        </label>
      </Field>

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button onClick={onSave} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, padding: '8px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          💾 保存
        </button>
        <button onClick={onCancel} style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '8px 24px', fontSize: 14, cursor: 'pointer' }}>
          キャンセル
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  )
}
