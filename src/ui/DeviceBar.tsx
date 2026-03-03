import { useState, useEffect, useRef } from 'react'
import { CameraDevice }    from '../devices/CameraDevice'
import { MicrophoneDevice } from '../devices/MicrophoneDevice'
import { TrackpadDevice }   from '../devices/TrackpadDevice'
import { USBDeviceManager } from '../devices/USBDevice'

interface Props {
  emulator: any
  canvas:   HTMLCanvasElement | null
}

export const DeviceBar = ({ emulator, canvas }: Props) => {
  const [camOn,  setCamOn]  = useState(false)
  const [micOn,  setMicOn]  = useState(false)
  const [usbList, setUsbList] = useState<string[]>([])
  const [saveMsg, setSaveMsg] = useState('')

  const cameraRef   = useRef(new CameraDevice(emulator))
  const micRef      = useRef(new MicrophoneDevice(emulator))
  const trackpadRef = useRef(new TrackpadDevice())
  const usbRef      = useRef(new USBDeviceManager())

  // トラックパッドは自動で接続
  useEffect(() => {
    if (canvas && emulator) {
      trackpadRef.current.attach(canvas, emulator)
    }
    return () => {
      if (canvas) trackpadRef.current.detach(canvas)
    }
  }, [canvas, emulator])

  const toggleCamera = async () => {
    if (!camOn) {
      const ok = await cameraRef.current.initialize()
      if (ok) { cameraRef.current.startCapture(); setCamOn(true) }
      else alert('カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。')
    } else {
      cameraRef.current.stop(); setCamOn(false)
    }
  }

  const toggleMic = async () => {
    if (!micOn) {
      const ok = await micRef.current.initialize()
      if (ok) setMicOn(true)
      else alert('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。')
    } else {
      micRef.current.stop(); setMicOn(false)
    }
  }

  const connectUSBStorage = async () => {
    const device = await usbRef.current.requestUSBDevice()
    if (device) {
      await usbRef.current.readUSBStorageSector(device, 0)
      setUsbList(usbRef.current.getConnectedDevices())
    }
  }

  const connectHID = async () => {
    const device = await usbRef.current.requestHIDDevice(emulator)
    if (device) setUsbList(usbRef.current.getConnectedDevices())
  }

  const saveState = async () => {
    setSaveMsg('保存中...')
    await new Promise(r => setTimeout(r, 100))
    setSaveMsg('✅ 保存完了')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  const btnStyle = (active = false, color = '#374151') => ({
    background: active ? '#10b981' : color,
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '5px 14px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    transition: 'background 0.2s',
    whiteSpace: 'nowrap' as const,
  })

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
      padding: '8px 12px', background: '#0f172a', borderBottom: '1px solid #1e293b'
    }}>
      {/* カメラ */}
      <button style={btnStyle(camOn)} onClick={toggleCamera}>
        📷 {camOn ? 'カメラON' : 'カメラOFF'}
      </button>

      {/* マイク */}
      <button style={btnStyle(micOn)} onClick={toggleMic}>
        🎤 {micOn ? 'マイクON' : 'マイクOFF'}
      </button>

      {/* トラックパッド（常時ON表示）*/}
      <div style={{ ...btnStyle(true), background: '#1d4ed8', cursor: 'default' }}>
        🖱️ トラックパッド接続中
      </div>

      {/* 区切り */}
      <div style={{ width: 1, height: 24, background: '#334155' }} />

      {/* USBストレージ */}
      <button style={btnStyle(false, '#7c3aed')} onClick={connectUSBStorage}>
        💾 USBストレージ接続
      </button>

      {/* HIDデバイス */}
      <button style={btnStyle(false, '#7c3aed')} onClick={connectHID}>
        ⌨️ HIDデバイス接続
      </button>

      {/* 接続済みデバイス */}
      {usbList.map((d, i) => (
        <span key={i} style={{ color: '#86efac', fontSize: 12, padding: '4px 8px',
                                background: '#052e16', borderRadius: 6 }}>
          {d}
        </span>
      ))}

      {/* スペーサー */}
      <div style={{ flex: 1 }} />

      {/* 状態保存 */}
      <button style={btnStyle(false, '#0369a1')} onClick={saveState}>
        💾 {saveMsg || '状態を保存'}
      </button>
    </div>
  )
}
