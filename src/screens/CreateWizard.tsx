import { useState } from 'react'
import { VMConfig, OSType, OS_PRESETS } from '../types/VMConfig'
import { vmStore } from '../core/VMStore'

interface Props {
  onCreated: (vm: VMConfig) => void
  onCancel:  () => void
}

const STEPS = ['OS種類', 'OSを選択', 'スペック設定', '確認して作成']
const P = OS_PRESETS

export const CreateWizard = ({ onCreated, onCancel }: Props) => {
  const [step,    setStep]    = useState(0)
  const [osType,  setOsType]  = useState<OSType>('linux')
  const [osVer,   setOsVer]   = useState(P.linux.versions[0])
  const [name,    setName]    = useState('Linux VM')
  const [memory,  setMemory]  = useState(512)
  const [storage, setStorage] = useState(20480)
  const [network, setNetwork] = useState(true)

  const selectType = (t: OSType) => {
    setOsType(t)
    setMemory(P[t].defaultMem)
    setStorage(P[t].defaultStorage)
    setOsVer(P[t].versions[0])
    setName(`${P[t].label} VM`)
  }

  const create = async () => {
    const id  = crypto.randomUUID()
    const vm: VMConfig = {
      id, name: name || `${P[osType].label} VM`,
      osType, osVersion: osVer,
      memoryMB: memory, storageMB: storage,
      network,
      hddKey: `hdd_${id}`,
      createdAt: Date.now(),
    }
    await vmStore.saveVM(vm)
    onCreated(vm)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1a1a2e', color: '#e2e8f0', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 600 }}>

        {/* ステップインジケーター */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          {STEPS.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < step ? '#22c55e' : i === step ? '#38bdf8' : '#1e293b',
                border: `2px solid ${i < step ? '#22c55e' : i === step ? '#38bdf8' : '#334155'}`,
                color: i <= step ? '#0f172a' : '#475569',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < step ? '#22c55e' : '#1e293b', margin: '0 4px' }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: '#475569', textAlign: 'center', marginBottom: 4, marginTop: -24 }}>
          {STEPS.map((l, i) => (
            <span key={i} style={{ color: i === step ? '#38bdf8' : '#334155', marginRight: i < STEPS.length - 1 ? 32 : 0 }}>{l}</span>
          ))}
        </div>

        {/* ── STEP 0: OS種類 ─────────────────────────────────────── */}
        {step === 0 && (
          <div>
            <Title>どのOSを使いますか？</Title>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {(Object.keys(P) as OSType[]).map(k => (
                <div key={k} onClick={() => selectType(k)}
                  style={{
                    padding: '20px 18px', borderRadius: 12, cursor: 'pointer',
                    background: osType === k ? '#1e3a5f' : '#1e293b',
                    border: `2px solid ${osType === k ? '#38bdf8' : '#334155'}`,
                    display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 32 }}>{P[k].icon}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{P[k].label}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{P[k].versions[0]}</div>
                  </div>
                  {osType === k && <span style={{ marginLeft: 'auto', color: '#38bdf8', fontSize: 18 }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: OSバージョン＋名前 ─────────────────────────── */}
        {step === 1 && (
          <div>
            <Title>{P[osType].icon} {P[osType].label} のバージョンを選択</Title>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {P[osType].versions.map(v => (
                <div key={v} onClick={() => setOsVer(v)}
                  style={{
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                    background: osVer === v ? '#1e3a5f' : '#1e293b',
                    border: `1px solid ${osVer === v ? '#38bdf8' : '#334155'}`,
                    color: osVer === v ? '#f1f5f9' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                  {v}
                  {osVer === v && <span style={{ color: '#38bdf8' }}>✓</span>}
                </div>
              ))}
            </div>
            <FieldLabel>仮想マシン名</FieldLabel>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="VM名を入力"
              style={{ width: '100%', background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 14, outline: 'none' }} />
          </div>
        )}

        {/* ── STEP 2: スペック ─────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <Title>メモリ・ストレージ・ネットワーク</Title>

            <FieldLabel>{`メモリ: ${memory} MB`}</FieldLabel>
            <input type="range" min={64} max={4096} step={64} value={memory} onChange={e => setMemory(+e.target.value)}
              style={{ width: '100%', accentColor: '#38bdf8', marginBottom: 4 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginBottom: 20 }}>
              <span>64MB（軽量DOS）</span><span>2048MB（推奨）</span><span>4096MB（重いOS）</span>
            </div>

            <FieldLabel>{`ストレージ: ${(storage/1024).toFixed(0)} GB`}</FieldLabel>
            <input type="range" min={512} max={65536} step={512} value={storage} onChange={e => setStorage(+e.target.value)}
              style={{ width: '100%', accentColor: '#38bdf8', marginBottom: 4 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginBottom: 20 }}>
              <span>0.5GB</span><span>20GB（推奨）</span><span>64GB</span>
            </div>

            <div style={{ background: '#1e293b', borderRadius: 10, padding: '14px 18px', border: '1px solid #334155' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={network} onChange={e => setNetwork(e.target.checked)}
                  style={{ accentColor: '#38bdf8', width: 18, height: 18 }} />
                <div>
                  <div style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 600 }}>🌐 イーサネット接続を有効にする</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    ゲストOS上でイーサネット接続として認識されます（RTL8139 NIC）。<br />
                    ネット接続にはリレーサーバー経由のVPNが必要です。
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ── STEP 3: 確認 ──────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <Title>✅ 内容を確認して作成</Title>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
              {[
                { label: 'VM名',         value: name },
                { label: 'OSの種類',     value: `${P[osType].icon} ${P[osType].label}` },
                { label: 'OSバージョン', value: osVer },
                { label: 'メモリ',       value: `${memory} MB` },
                { label: 'ストレージ',   value: `${(storage/1024).toFixed(0)} GB` },
                { label: 'ネットワーク', value: network ? '✅ RTL8139 イーサネット' : '❌ 無効' },
              ].map(r => (
                <div key={r.label} style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', border: '1px solid #2d2d44' }}>
                  <div style={{ fontSize: 11, color: '#475569', marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 13, color: '#cbd5e1' }}>{r.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#0c1e0c', border: '1px solid #166534', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#86efac' }}>
              💡 作成後、ホーム画面でISOファイルを選択して起動できます。
            </div>
          </div>
        )}

        {/* ナビゲーションボタン */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
          <button onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}
            style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer' }}>
            {step === 0 ? 'キャンセル' : '← 戻る'}
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)}
              style={{ background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              次へ →
            </button>
          ) : (
            <button onClick={create}
              style={{ background: '#22c55e', color: '#052e16', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              ➕ 仮想マシンを作成
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Title({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 20 }}>{children}</div>
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>{children}</div>
}
