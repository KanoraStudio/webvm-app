// WebUSB / WebHID / Gamepad API
// TypeScript の型定義を手動宣言（@types/wicg-* パッケージ不要）

// ── 型宣言 ────────────────────────────────────────────────────────────
interface USBDevice {
  productName: string
  manufacturerName: string
  configuration: USBConfiguration | null
  open(): Promise<void>
  close(): Promise<void>
  selectConfiguration(configurationValue: number): Promise<void>
  claimInterface(interfaceNumber: number): Promise<void>
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>
  transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>
}
interface USBConfiguration { configurationValue: number }
interface USBOutTransferResult { bytesWritten: number }
interface USBInTransferResult { data: DataView | null }
interface USBDeviceFilter { vendorId?: number; productId?: number }
interface USB {
  requestDevice(options: { filters: USBDeviceFilter[] }): Promise<USBDevice>
  getDevices(): Promise<USBDevice[]>
}

interface HIDDevice {
  productName: string
  collections: Array<{ usage?: number; usagePage?: number }>
  open(): Promise<void>
  close(): Promise<void>
  addEventListener(type: 'inputreport', listener: (e: HIDInputReportEvent) => void): void
}
interface HIDInputReportEvent {
  reportId: number
  data: DataView
  device: HIDDevice
}
interface HIDDeviceFilter { usagePage?: number; usage?: number }
interface HID {
  requestDevice(options: { filters: HIDDeviceFilter[] }): Promise<HIDDevice[]>
  getDevices(): Promise<HIDDevice[]>
}

declare global {
  interface Navigator {
    usb?: USB
    hid?: HID
  }
}

// ── 実装 ──────────────────────────────────────────────────────────────
export class USBDeviceManager {
  private usbDevices: USBDevice[] = []
  private hidDevices: HIDDevice[] = []
  private rafId: number | null = null

  // =============================================
  //  WebUSB — USBストレージ・汎用デバイス
  // =============================================

  get isWebUSBSupported(): boolean {
    return !!navigator.usb
  }

  async requestUSBDevice(): Promise<USBDevice | null> {
    if (!navigator.usb) {
      alert('WebUSB非対応です。Chrome または Edge を使用してください。')
      return null
    }
    try {
      const device = await navigator.usb.requestDevice({ filters: [] })
      await device.open()
      if (device.configuration === null) {
        await device.selectConfiguration(1)
      }
      this.usbDevices.push(device)
      console.log(`[USB] 接続: ${device.productName} / ${device.manufacturerName}`)
      return device
    } catch (e) {
      console.log('[USB] 選択キャンセルまたはエラー:', e)
      return null
    }
  }

  async readUSBStorageSector(device: USBDevice, lba: number): Promise<Uint8Array | null> {
    try {
      await device.claimInterface(0)
      const cbw = new Uint8Array(31)
      cbw.set([0x55, 0x53, 0x42, 0x43], 0)
      cbw.set([0x01, 0x00, 0x00, 0x00], 4)
      cbw.set([0x00, 0x02, 0x00, 0x00], 8)
      cbw[12] = 0x80
      cbw[14] = 0x0A
      cbw.set([
        0x28, 0x00,
        (lba >> 24) & 0xFF, (lba >> 16) & 0xFF,
        (lba >> 8) & 0xFF, lba & 0xFF,
        0x00, 0x00, 0x01, 0x00,
      ], 15)
      await device.transferOut(2, cbw)
      const result = await device.transferIn(1, 512)
      if (!result.data) return null
      return new Uint8Array(result.data.buffer)
    } catch (e) {
      console.error('[USB] セクター読み取りエラー:', e)
      return null
    }
  }

  async disconnectUSB(device: USBDevice): Promise<void> {
    await device.close()
    this.usbDevices = this.usbDevices.filter(d => d !== device)
  }

  // =============================================
  //  WebHID — キーボード・マウス
  // =============================================

  get isWebHIDSupported(): boolean {
    return !!navigator.hid
  }

  async requestHIDDevice(emulator: any): Promise<HIDDevice | null> {
    if (!navigator.hid) {
      alert('WebHID非対応です。Chrome または Edge を使用してください。')
      return null
    }
    try {
      const devices = await navigator.hid.requestDevice({
        filters: [
          { usagePage: 0x01, usage: 0x06 },
          { usagePage: 0x01, usage: 0x02 },
        ],
      })
      const device = devices[0]
      if (!device) return null
      await device.open()
      this.hidDevices.push(device)
      device.addEventListener('inputreport', (event: HIDInputReportEvent) => {
        this.handleHIDReport(event, emulator)
      })
      console.log(`[HID] 接続: ${device.productName}`)
      return device
    } catch (e) {
      console.log('[HID] 選択キャンセルまたはエラー:', e)
      return null
    }
  }

  private handleHIDReport(event: HIDInputReportEvent, emulator: any): void {
    const bytes = new Uint8Array(event.data.buffer)
    const usage = event.device.collections[0]?.usage

    // キーボード
    if (usage === 0x06 && emulator) {
      const keyCodes = Array.from(bytes.slice(2, 8)).filter(k => k !== 0)
      const HIDtoPS2: Record<number, number> = {
        0x04:0x1E,0x05:0x30,0x06:0x2E,0x07:0x20,0x08:0x12,0x09:0x21,
        0x0A:0x22,0x0B:0x23,0x0C:0x17,0x0D:0x24,0x0E:0x25,0x0F:0x26,
        0x10:0x32,0x11:0x31,0x12:0x18,0x13:0x19,0x14:0x10,0x15:0x13,
        0x16:0x1F,0x17:0x14,0x18:0x16,0x19:0x2F,0x1A:0x11,0x1B:0x2D,
        0x1C:0x15,0x1D:0x2C,0x28:0x1C,0x29:0x01,0x2C:0x39,
      }
      const scancodes = keyCodes.map(k => HIDtoPS2[k]).filter(Boolean)
      if (scancodes.length > 0) emulator.keyboard_send_scancodes(scancodes)
    }

    // マウス
    if (usage === 0x02 && emulator) {
      const dx = new Int8Array([bytes[1]])[0]
      const dy = new Int8Array([bytes[2]])[0]
      if (dx !== 0 || dy !== 0) emulator.mouse_move(dx, dy)
      emulator.mouse_button(1, !!(bytes[0] & 0x01))
      emulator.mouse_button(2, !!(bytes[0] & 0x02))
    }
  }

  async disconnectHID(device: HIDDevice): Promise<void> {
    await device.close()
    this.hidDevices = this.hidDevices.filter(d => d !== device)
  }

  // =============================================
  //  Gamepad API
  // =============================================

  startGamepadPolling(_emulator: any): void {
    window.addEventListener('gamepadconnected', (e) => {
      console.log(`[Gamepad] 接続: ${e.gamepad.id}`)
    })
    const poll = () => { this.rafId = requestAnimationFrame(poll) }
    this.rafId = requestAnimationFrame(poll)
  }

  stopGamepadPolling(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId)
  }

  // =============================================
  //  ユーティリティ
  // =============================================

  getConnectedDevices(): string[] {
    return [
      ...this.usbDevices.map(d => `💾 USB: ${d.productName || '不明'}`),
      ...this.hidDevices.map(d => `⌨️  HID: ${d.productName || '不明'}`),
    ]
  }

  async disconnectAll(): Promise<void> {
    for (const d of this.usbDevices) await d.close().catch(() => {})
    for (const d of this.hidDevices) await d.close().catch(() => {})
    this.usbDevices = []
    this.hidDevices = []
    this.stopGamepadPolling()
  }
}
