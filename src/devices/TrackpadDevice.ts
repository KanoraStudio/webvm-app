export class TrackpadDevice {
  private lastX = 0
  private lastY = 0
  private attached = false
  private handlers: Record<string, EventListener> = {}

  attach(canvas: HTMLCanvasElement, emulator: any): void {
    if (this.attached) return
    this.attached = true

    // マウス移動（相対座標）
    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - this.lastX
      const dy = e.clientY - this.lastY
      emulator?.mouse_move(dx, dy)
      this.lastX = e.clientX
      this.lastY = e.clientY
    }

    // ボタン押下
    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      const btn = e.button === 0 ? 1 : e.button === 2 ? 2 : 4
      emulator?.mouse_button(btn, true)
      this.lastX = e.clientX
      this.lastY = e.clientY
    }

    // ボタン離す
    const onPointerUp = (e: PointerEvent) => {
      const btn = e.button === 0 ? 1 : e.button === 2 ? 2 : 4
      emulator?.mouse_button(btn, false)
    }

    // スクロール・ピンチ
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -1 : 1
      emulator?.mouse_wheel(0, delta)
    }

    // タッチ（モバイル）→ マウスイベント変換
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      this.lastX = t.clientX
      this.lastY = t.clientY
      emulator?.mouse_button(1, true)
    }
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.touches[0]
      emulator?.mouse_move(t.clientX - this.lastX, t.clientY - this.lastY)
      this.lastX = t.clientX
      this.lastY = t.clientY
    }
    const onTouchEnd = () => emulator?.mouse_button(1, false)

    // キーボード
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      emulator?.keyboard_send_scancodes([e.keyCode])
    }
    const onKeyUp = (e: KeyboardEvent) => {
      emulator?.keyboard_send_scancodes([e.keyCode | 0x80])
    }

    // 右クリックメニュー無効化
    const onContextMenu = (e: Event) => e.preventDefault()

    canvas.addEventListener('pointermove',  onPointerMove as EventListener)
    canvas.addEventListener('pointerdown',  onPointerDown as EventListener)
    canvas.addEventListener('pointerup',    onPointerUp   as EventListener)
    canvas.addEventListener('wheel',        onWheel       as EventListener, { passive: false })
    canvas.addEventListener('touchstart',   onTouchStart  as EventListener, { passive: false })
    canvas.addEventListener('touchmove',    onTouchMove   as EventListener, { passive: false })
    canvas.addEventListener('touchend',     onTouchEnd    as EventListener)
    canvas.addEventListener('contextmenu',  onContextMenu)
    window.addEventListener('keydown',      onKeyDown as EventListener)
    window.addEventListener('keyup',        onKeyUp   as EventListener)

    this.handlers = {
      pointermove: onPointerMove as EventListener,
      pointerdown: onPointerDown as EventListener,
      pointerup:   onPointerUp   as EventListener,
      wheel:       onWheel       as EventListener,
      touchstart:  onTouchStart  as EventListener,
      touchmove:   onTouchMove   as EventListener,
      touchend:    onTouchEnd    as EventListener,
      contextmenu: onContextMenu,
      keydown:     onKeyDown as EventListener,
      keyup:       onKeyUp   as EventListener,
    }

    console.log('[Trackpad] 接続完了')
  }

  detach(canvas: HTMLCanvasElement): void {
    canvas.removeEventListener('pointermove',  this.handlers.pointermove)
    canvas.removeEventListener('pointerdown',  this.handlers.pointerdown)
    canvas.removeEventListener('pointerup',    this.handlers.pointerup)
    canvas.removeEventListener('wheel',        this.handlers.wheel)
    canvas.removeEventListener('touchstart',   this.handlers.touchstart)
    canvas.removeEventListener('touchmove',    this.handlers.touchmove)
    canvas.removeEventListener('touchend',     this.handlers.touchend)
    canvas.removeEventListener('contextmenu',  this.handlers.contextmenu)
    window.removeEventListener('keydown',      this.handlers.keydown)
    window.removeEventListener('keyup',        this.handlers.keyup)
    this.attached = false
  }
}
