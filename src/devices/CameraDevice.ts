export class CameraDevice {
  private stream: MediaStream | null = null
  private frameCanvas: OffscreenCanvas
  private frameCtx: OffscreenCanvasRenderingContext2D
  private intervalId: number | null = null
  private videoElement: HTMLVideoElement | null = null
  private guestFramebufferAddr: number = 0

  constructor(
    private emulator: any,
    private width  = 640,
    private height = 480
  ) {
    this.frameCanvas = new OffscreenCanvas(width, height)
    this.frameCtx    = this.frameCanvas.getContext('2d')!
  }

  async initialize(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: this.width }, height: { ideal: this.height }, facingMode: 'user' },
        audio: false,
      })
      const settings = this.stream.getVideoTracks()[0].getSettings()
      console.log(`[Camera] 初期化成功: ${settings.width}x${settings.height}`)
      return true
    } catch (e) {
      console.error('[Camera] アクセス失敗:', e)
      return false
    }
  }

  startCapture(): void {
    // 非表示のvideo要素でキャプチャ
    this.videoElement = document.createElement('video')
    this.videoElement.srcObject = this.stream
    this.videoElement.muted = true
    this.videoElement.style.display = 'none'
    document.body.appendChild(this.videoElement)
    this.videoElement.play()

    // 30fps でフレームをゲストメモリへ
    this.intervalId = window.setInterval(() => {
      if (this.videoElement) this.captureFrame(this.videoElement)
    }, 1000 / 30)
  }

  private captureFrame(video: HTMLVideoElement): void {
    this.frameCtx.drawImage(video, 0, 0, this.width, this.height)
    const imageData = this.frameCtx.getImageData(0, 0, this.width, this.height)
    const yuyvData  = this.rgbaToYuyv(imageData.data)

    // ゲストメモリの仮想V4L2フレームバッファへ書き込む
    if (this.emulator && this.guestFramebufferAddr !== 0) {
      this.emulator.v86?.cpu?.mem8?.set(yuyvData, this.guestFramebufferAddr)
    }
  }

  // RGBA(4bytes) → YUYV(2bytes) 変換
  private rgbaToYuyv(rgba: Uint8ClampedArray): Uint8Array {
    const yuyv = new Uint8Array((rgba.length / 4) * 2)
    for (let i = 0, j = 0; i < rgba.length; i += 8, j += 4) {
      const [r1,g1,b1] = [rgba[i],   rgba[i+1], rgba[i+2]]
      const [r2,g2,b2] = [rgba[i+4], rgba[i+5], rgba[i+6]]
      const y1 =  0.299*r1 + 0.587*g1 + 0.114*b1
      const y2 =  0.299*r2 + 0.587*g2 + 0.114*b2
      const u  = -0.169*r1 - 0.331*g1 + 0.500*b1 + 128
      const v  =  0.500*r1 - 0.419*g1 - 0.081*b1 + 128
      yuyv[j]=y1; yuyv[j+1]=u; yuyv[j+2]=y2; yuyv[j+3]=v
    }
    return yuyv
  }

  setGuestFramebufferAddr(addr: number): void {
    this.guestFramebufferAddr = addr
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId)
    this.stream?.getTracks().forEach(t => t.stop())
    this.videoElement?.remove()
    this.videoElement = null
    this.stream = null
    console.log('[Camera] 停止')
  }
}
