import { vmStore } from './VMStore'
import { VMConfig } from '../types/VMConfig'

declare const V86Starter: any

export interface StartOptions {
  vm: VMConfig
  isoFile?: File
  onReady?: () => void
  onSerial?: (line: string) => void
  onStateChange?: (msg: string) => void
}

// ベースパスを自動検出（GitHub Pages サブパス対応）
function getBase(): string {
  const p = location.pathname
  const m = p.match(/^(\/[^/]+\/)/)
  if (m && m[1] !== '/') return m[1]
  return '/'
}

async function checkFile(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: 'HEAD' })
    return r.ok
  } catch { return false }
}

export class EmulatorManager {
  private emulator: any = null
  private isoUrl:   string | null = null

  async start(opts: StartOptions, container: HTMLElement): Promise<void> {
    const { vm, isoFile } = opts
    const base = getBase()

    const wasmPath  = base + 'v86/v86.wasm'
    const biosPath  = base + 'bios/seabios.bin'
    const vbiosPath = base + 'bios/vgabios.bin'

    opts.onStateChange?.('🔍 必須ファイルを確認中...')
    const [wasmOk, biosOk, vbiosOk] = await Promise.all([
      checkFile(wasmPath), checkFile(biosPath), checkFile(vbiosPath)
    ])

    if (!wasmOk)  throw new Error(`${wasmPath} が見つかりません。npm run setup → npm run deploy:github を実行してください。`)
    if (!biosOk)  throw new Error(`${biosPath} が見つかりません。npm run setup を実行してください。`)
    if (!vbiosOk) throw new Error(`${vbiosPath} が見つかりません。npm run setup を実行してください。`)
    opts.onStateChange?.('✅ 必須ファイル確認OK')

    if (typeof V86Starter === 'undefined') {
      throw new Error('V86Starter が未定義です。libv86.js の読み込みに失敗しています。')
    }

    opts.onStateChange?.('💾 HDDイメージを確認中...')
    const savedHDD  = await vmStore.loadHDD(vm.hddKey)
    const hddBuffer = savedHDD ?? new ArrayBuffer(Math.min(vm.storageMB, 4096) * 1024 * 1024)
    opts.onStateChange?.(savedHDD ? '✅ 保存済みHDDを復元しました' : '🆕 新規仮想HDDを作成しました')

    let cdromConfig: any = undefined
    if (isoFile) {
      opts.onStateChange?.('📀 ISOをBlobURLに変換中...')
      this.isoUrl = URL.createObjectURL(isoFile)
      cdromConfig = { url: this.isoUrl, async: true, size: isoFile.size }
      opts.onStateChange?.(`✅ BlobURL作成（${(isoFile.size/1024/1024).toFixed(0)}MB）`)
    }

    opts.onStateChange?.('⚙️ v86エミュレーターを起動中...')
    this.emulator = new V86Starter({
      wasm_path:        wasmPath,
      bios:             { url: biosPath },
      vga_bios:         { url: vbiosPath },
      memory_size:      vm.memoryMB * 1024 * 1024,
      vga_memory_size:  8 * 1024 * 1024,
      screen_container: container,
      cdrom:  cdromConfig,
      hda:    { buffer: hddBuffer, async: true },
      network_relay_url: vm.network ? 'wss://relay.widgetry.org/' : undefined,
      autostart: true,
    })

    opts.onStateChange?.('🔧 BIOS POST実行中...')

    this.emulator.add_listener('emulator-ready', () => {
      opts.onStateChange?.('🎉 emulator-ready！')
      opts.onReady?.()
    })

    let buf = ''
    this.emulator.add_listener('serial0-output-char', (ch: string) => {
      buf += ch
      if (ch === '\n') {
        const line = buf.replace(/\x1b\[[0-9;]*[mKJH]/g, '').trim()
        if (line) opts.onSerial?.(line)
        buf = ''
      }
    })
  }

  syncResolution(w: number, h: number) {
    if (!this.emulator) return
    try { this.emulator.screen_set_size_graphical?.(w, h) } catch {}
    this.emulator.keyboard_send_text?.(`xrandr -s ${w}x${h}\n`)
  }

  copyToGuest(text: string) { this.emulator?.keyboard_send_text?.(text) }
  keyboard_send_text(text: string) { this.emulator?.keyboard_send_text?.(text) }

  async saveState(hddKey: string) {
    try {
      const s = this.emulator?.save_state?.()
      if (s) await vmStore.saveHDD(hddKey, s)
    } catch (e) { console.warn('saveState error:', e) }
  }

  getEmulator() { return this.emulator }

  destroy() {
    this.emulator?.destroy?.()
    this.emulator = null
    if (this.isoUrl) { URL.revokeObjectURL(this.isoUrl); this.isoUrl = null }
  }
}
